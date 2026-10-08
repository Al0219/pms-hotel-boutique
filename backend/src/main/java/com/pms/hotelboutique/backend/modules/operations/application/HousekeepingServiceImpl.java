package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.operations.domain.HkRoomState;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.HkRoomStateRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@Transactional
public class HousekeepingServiceImpl implements HousekeepingService {

    private final HkRoomStateRepository states;
    private final AuditService audit;

    public HousekeepingServiceImpl(HkRoomStateRepository states, AuditService audit) {
        this.states = states;
        this.audit = audit;
    }

    @Override
    public HkRoomView trackRoom(UUID propertyId, UUID roomId, UUID actorId) {
        requireIds(propertyId, roomId);
        return HkRoomView.from(states.findByPropertyIdAndRoomId(propertyId, roomId)
                .orElseGet(() -> states.save(new HkRoomState(UUID.randomUUID(), propertyId, roomId,
                        Instant.now()))));
    }

    @Override
    @Transactional(readOnly = true)
    public HkRoomView statusOf(UUID propertyId, UUID roomId) {
        return HkRoomView.from(existing(propertyId, roomId));
    }

    @Override
    public HkRoomView markClean(UUID propertyId, UUID roomId, UUID actorId) {
        return transition(propertyId, roomId, actorId, "HK_CLEANED", (state, now) -> state.markClean(now));
    }

    @Override
    public HkRoomView markDirty(UUID propertyId, UUID roomId, UUID actorId) {
        return transition(propertyId, roomId, actorId, "HK_SOILED", (state, now) -> state.markDirty(now));
    }

    @Override
    public HkRoomView inspect(UUID propertyId, UUID roomId, UUID actorId) {
        return transition(propertyId, roomId, actorId, "HK_INSPECTED", (state, now) -> state.inspect(now));
    }

    @Override
    public HkRoomView rejectInspection(UUID propertyId, UUID roomId, String reason, UUID actorId) {
        if (reason == null || reason.isBlank()) {
            throw new HousekeepingException("rejection reason is required");
        }
        HkRoomState state = existing(propertyId, roomId);
        HkRoomState.Status before = state.getStatus();
        try {
            state.rejectInspection(Instant.now());
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw new HousekeepingException(e.getMessage(), e);
        }
        state.recordActor(actorId);
        record(state, "HK_INSPECTION_REJECTED", before, reason.trim(), actorId);
        return HkRoomView.from(state);
    }

    @Override
    public HkRoomView setDnd(UUID propertyId, UUID roomId, boolean dnd, UUID actorId) {
        HkRoomState state = existing(propertyId, roomId);
        boolean before = state.isDnd();
        state.setDnd(dnd, Instant.now());
        state.recordActor(actorId);
        if (before != dnd) {
            record(state, "HK_DND_CHANGED", null, dnd ? "DND on" : "DND off", actorId);
        }
        return HkRoomView.from(state);
    }

    @Override
    @Transactional(readOnly = true)
    public List<HkRoomView> listByScope(AuthorizedPropertyScope scope) {
        return states.findByPropertyIdIn(authorizedIds(scope)).stream()
                .map(HkRoomView::from).toList();
    }

    private HkRoomView transition(UUID propertyId, UUID roomId, UUID actorId, String action,
            HkTransition transition) {
        HkRoomState state = existing(propertyId, roomId);
        HkRoomState.Status before = state.getStatus();
        try {
            transition.apply(state, Instant.now());
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw new HousekeepingException(e.getMessage(), e);
        }
        state.recordActor(actorId);
        record(state, action, before, null, actorId);
        return HkRoomView.from(state);
    }

    private HkRoomState existing(UUID propertyId, UUID roomId) {
        requireIds(propertyId, roomId);
        return states.findByPropertyIdAndRoomId(propertyId, roomId)
                .orElseThrow(() -> new HousekeepingException("room is not tracked"));
    }

    private void record(HkRoomState state, String action, HkRoomState.Status before, String reason,
            UUID actorId) {
        ReservationAuditEvent.ActorType type = actorId == null
                ? ReservationAuditEvent.ActorType.SYSTEM
                : ReservationAuditEvent.ActorType.STAFF;
        audit.record(new AuditService.RecordAuditCommand(type, actorId, action, "HK_ROOM_STATE",
                state.getId(), state.getPropertyId(),
                before == null ? null : "{\"status\":\"" + before + "\"}",
                "{\"status\":\"" + state.getStatus() + "\"}", reason, null));
    }

    private static java.util.Set<UUID> authorizedIds(AuthorizedPropertyScope scope) {
        if (scope == null || scope.propertyIds() == null || scope.propertyIds().isEmpty()) {
            throw new HousekeepingException("an explicit property scope is required");
        }
        return scope.propertyIds();
    }

    private static void requireIds(UUID propertyId, UUID roomId) {
        if (propertyId == null || roomId == null) {
            throw new HousekeepingException("property and room ids are required");
        }
    }

    @FunctionalInterface
    private interface HkTransition {
        void apply(HkRoomState state, Instant now);
    }
}
