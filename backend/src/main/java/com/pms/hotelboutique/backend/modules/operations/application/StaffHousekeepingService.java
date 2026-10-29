package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.inventory.domain.Room;
import com.pms.hotelboutique.backend.modules.inventory.domain.RoomType;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.RoomRepository;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.RoomTypeRepository;
import com.pms.hotelboutique.backend.modules.operations.domain.HkRoomState;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.HkRoomStateRepository;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.HousekeepingReasonRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Authenticated boundary; the existing HK service remains the lifecycle authority. */
@Service
@Transactional
public class StaffHousekeepingService {
    private final StaffAuthService sessions;
    private final StaffAuthorizationService authorization;
    private final PropertyScopeResolver scopes;
    private final RoomRepository rooms;
    private final RoomTypeRepository types;
    private final HkRoomStateRepository states;
    private final HousekeepingService housekeeping;
    private final AuditService audit;
    private final EntityManager entities;
    private final HousekeepingReasonRepository reasons;

    public StaffHousekeepingService(StaffAuthService sessions, StaffAuthorizationService authorization,
            PropertyScopeResolver scopes, RoomRepository rooms, RoomTypeRepository types,
            HkRoomStateRepository states, HousekeepingService housekeeping, AuditService audit, EntityManager entities,
            HousekeepingReasonRepository reasons) {
        this.sessions = sessions; this.authorization = authorization; this.scopes = scopes;
        this.rooms = rooms; this.types = types; this.states = states; this.housekeeping = housekeeping;
        this.audit = audit; this.entities = entities;
        this.reasons = reasons;
    }

    @Transactional(readOnly = true)
    public Board list(StaffPrincipal principal, UUID propertyId) {
        var access = access(principal, propertyId, false);
        var roomTypes = types.findAllInScope(access.scope()).stream()
                .collect(Collectors.toMap(RoomType::getId, RoomType::getName));
        var tracked = states.findByPropertyIdIn(access.scope().propertyIds()).stream()
                .collect(Collectors.toMap(HkRoomState::getRoomId, Function.identity()));
        var cleaningReasons = cleaningReasons(propertyId, tracked.values());
        var result = rooms.findAllInScope(access.scope()).stream()
                .sorted(Comparator.comparing(Room::getCode).thenComparing(Room::getId))
                .map(room -> view(room, roomTypes.get(room.getRoomTypeId()), tracked.get(room.getId()), cleaningReasons)).toList();
        return new Board(propertyId, result);
    }

    @Transactional(readOnly = true)
    public RoomState detail(StaffPrincipal principal, UUID propertyId, UUID roomId) {
        var access = access(principal, propertyId, false);
        var room = rooms.findByIdInScope(access.scope(), roomId).orElseThrow(NotFound::new);
        return view(room, typeName(access, room), states.findByPropertyIdAndRoomId(propertyId, roomId).orElse(null));
    }

    public RoomState track(StaffPrincipal principal, UUID propertyId, UUID roomId) {
        var access = access(principal, propertyId);
        var room = lock(access, propertyId, roomId);
        var existing = states.findByPropertyIdAndRoomId(propertyId, roomId);
        if (existing.isPresent()) return view(room, typeName(access, room), existing.get());
        housekeeping.trackRoom(propertyId, roomId, access.actor());
        var state = state(propertyId, roomId);
        state.recordActor(access.actor());
        audit.record(new AuditService.RecordAuditCommand(ReservationAuditEvent.ActorType.STAFF,
                access.actor(), "HK_TRACKED", "HK_ROOM_STATE", state.getId(), propertyId,
                null, "{\"status\":\"DIRTY\",\"dnd\":false}", "Initial housekeeping tracking", UUID.randomUUID()));
        return persisted(access, room, state);
    }

    public RoomState transition(StaffPrincipal principal, UUID propertyId, UUID roomId,
            HkRoomState.Status expectedStatus, Instant expectedUpdatedAt, HkRoomState.Status target, String reason) {
        var access = access(principal, propertyId);
        var room = lock(access, propertyId, roomId);
        var state = state(propertyId, roomId);
        requireVersion(state, expectedUpdatedAt);
        if (expectedStatus == null || target == null || state.getStatus() != expectedStatus) throw new Conflict();
        if (target == HkRoomState.Status.DIRTY && (reason == null || reason.isBlank() || reason.length() > 280))
            throw new IllegalArgumentException("A reason is required");
        if (target != HkRoomState.Status.DIRTY && reason != null)
            throw new IllegalArgumentException("Reason only applies to rework or rejection");
        try {
            if (target == HkRoomState.Status.CLEAN && expectedStatus == HkRoomState.Status.DIRTY)
                housekeeping.markClean(propertyId, roomId, access.actor());
            else if (target == HkRoomState.Status.INSPECTED && expectedStatus == HkRoomState.Status.CLEAN)
                housekeeping.inspect(propertyId, roomId, access.actor());
            else if (target == HkRoomState.Status.DIRTY && expectedStatus == HkRoomState.Status.CLEAN)
                housekeeping.markDirty(propertyId, roomId, reason, access.actor());
            else if (target == HkRoomState.Status.DIRTY && expectedStatus == HkRoomState.Status.INSPECTED)
                housekeeping.rejectInspection(propertyId, roomId, reason, access.actor());
            else throw new Conflict();
        } catch (HousekeepingException exception) { throw new Conflict(); }
        return persisted(access, room, state);
    }

    public RoomState dnd(StaffPrincipal principal, UUID propertyId, UUID roomId, Instant expectedUpdatedAt, boolean dnd) {
        var access = access(principal, propertyId);
        var room = lock(access, propertyId, roomId);
        var state = state(propertyId, roomId);
        requireVersion(state, expectedUpdatedAt);
        if (state.isDnd() != dnd) housekeeping.setDnd(propertyId, roomId, dnd, access.actor());
        return persisted(access, room, state);
    }

    private Access access(StaffPrincipal principal, UUID propertyId) {
        return access(principal, propertyId, true);
    }
    private Access access(StaffPrincipal principal, UUID propertyId, boolean write) {
        if (principal == null) throw new StaffAuthenticationException();
        var active = sessions.getActivePrincipal(principal);
        var snapshot = authorization.resolve(active.staffUserId());
        if (!snapshot.hasPermission("OPERATIONS_MANAGE") && (write || !snapshot.hasPermission("RESERVATION_MANAGE")))
            throw new AccessDeniedException("Housekeeping permission required");
        return new Access(active.staffUserId(), scopes.resolveProperty(snapshot, propertyId));
    }
    private Room lock(Access access, UUID propertyId, UUID roomId) {
        return rooms.lockInProperty(access.scope(), propertyId, roomId).orElseThrow(NotFound::new);
    }
    private HkRoomState state(UUID propertyId, UUID roomId) {
        return states.findByPropertyIdAndRoomId(propertyId, roomId).orElseThrow(Conflict::new);
    }
    private static void requireVersion(HkRoomState state, Instant expected) {
        if (expected == null || !state.getUpdatedAt().equals(expected)) throw new Conflict();
    }
    private String typeName(Access access, Room room) {
        return types.findByIdInScope(access.scope(), room.getRoomTypeId()).orElseThrow(NotFound::new).getName();
    }
    private RoomState persisted(Access access, Room room, HkRoomState state) {
        // PostgreSQL stores microseconds: return the persisted token, not JVM nanoseconds.
        entities.flush(); entities.refresh(state);
        return view(room, typeName(access, room), state);
    }
    private Map<UUID, String> cleaningReasons(UUID propertyId, Collection<HkRoomState> tracked) {
        var ids = tracked.stream().filter(state -> state.getStatus() == HkRoomState.Status.DIRTY)
                .map(HkRoomState::getId).toList();
        if (ids.isEmpty()) return Map.of();
        var result = new HashMap<UUID, String>();
        for (var entry : reasons.latestCleaningReasons(propertyId, ids)) {
            if (entry.getReason() != null && !entry.getReason().isBlank())
                result.put(entry.getStateId(), entry.getReason());
        }
        return result;
    }
    private RoomState view(Room room, String type, HkRoomState state) {
        return view(room, type, state, state == null ? Map.of() : cleaningReasons(room.getPropertyId(), List.of(state)));
    }
    private static RoomState view(Room room, String type, HkRoomState state, Map<UUID, String> reasons) {
        if (type == null) throw new NotFound();
        return new RoomState(room.getId(), room.getPropertyId(), room.getCode(), room.getRoomTypeId(), type,
                state != null, state == null ? null : state.getStatus(), state == null ? null : state.isDnd(),
                state == null ? null : state.getUpdatedAt(), state == null ? null : reasons.get(state.getId()));
    }
    private record Access(UUID actor, AuthorizedPropertyScope scope) { }
    public static class NotFound extends RuntimeException { }
    public static class Conflict extends RuntimeException { }

    @Schema(name = "StaffHousekeepingRoom")
    public record RoomState(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID roomId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID propertyId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String roomCode,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID roomTypeId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String roomTypeName,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean tracked,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, types = {"string", "null"}, allowableValues = {"DIRTY", "CLEAN", "INSPECTED"}) HkRoomState.Status status,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, types = {"boolean", "null"}) Boolean dnd,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, types = {"string", "null"}, format = "date-time") Instant updatedAt,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, types = {"string", "null"}, description = "Current return-to-cleaning reason from append-only audit; null unless DIRTY with a recorded reason.") String cleaningReason) { }
    @Schema(name = "StaffHousekeepingBoard")
    public record Board(@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID propertyId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<RoomState> rooms) { }
}
