package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.*;
import com.pms.hotelboutique.backend.modules.inventory.domain.Room;
import com.pms.hotelboutique.backend.modules.reservations.domain.*;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationStayRepository;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@Transactional
public class StaffRoomAssignmentService {
    private final StaffReservationReadService reads;
    private final ReservationStayRepository stays;
    private final RoomRepository rooms;
    private final RoomTypeRepository types;
    private final OutOfOrderRepository blocks;
    private final AuditService audit;
    private final ObjectMapper json;

    public StaffRoomAssignmentService(StaffReservationReadService reads, ReservationStayRepository stays,
            RoomRepository rooms, RoomTypeRepository types, OutOfOrderRepository blocks, AuditService audit, ObjectMapper json) {
        this.reads = reads; this.stays = stays; this.rooms = rooms; this.types = types;
        this.blocks = blocks; this.audit = audit; this.json = json;
    }

    @Transactional(readOnly = true)
    public Preview preview(StaffPrincipal principal, UUID property, UUID reservation, UUID stayId) {
        var scope = reads.authorize(principal, property);
        var stay = target(scope, reservation, stayId, false);
        boolean eligible = eligible(stay);
        var type = types.findByIdInScope(scope, stay.getRoomTypeId()).orElseThrow(() -> new ReservationQueryException("Stay not found"));
        var candidates = eligible ? rooms.findAllInScope(scope).stream()
                .filter(r -> r.getRoomTypeId().equals(stay.getRoomTypeId()))
                .filter(r -> available(scope, stay, r))
                .sorted(Comparator.comparing(Room::getCode).thenComparing(Room::getId))
                .map(r -> new Candidate(r.getId(), r.getCode(), null, "ACTIVE", true, null)).toList() : List.<Candidate>of();
        return new Preview(property, reservation, stayId, stay.getArrival(), stay.getDeparture(), type.getId(),
                type.getName(), eligible, eligible ? null : "La estadía ya está asignada o no admite asignación inicial.", candidates);
    }

    public Result assign(StaffPrincipal principal, UUID property, UUID reservation, UUID stayId, UUID roomId) {
        var scope = reads.authorize(principal, property);
        var stay = target(scope, reservation, stayId, true);
        if (!eligible(stay)) throw new Conflict();
        // Shared physical-room lock serializes competing assignment commands.
        var room = rooms.lockInProperty(scope, property, roomId).orElseThrow(() -> new ReservationQueryException("Room not found"));
        if (!room.getRoomTypeId().equals(stay.getRoomTypeId()) || !available(scope, stay, room)) throw new Conflict();
        stay.assignRoom(roomId, Instant.now());
        audit.record(new AuditService.RecordAuditCommand(ReservationAuditEvent.ActorType.STAFF,
                principal.staffUserId(), "RESERVATION_STAY_ROOM_ASSIGNED", "RESERVATION_STAY", stayId, property,
                "{\"roomId\":null}", json.writeValueAsString(Map.of("roomId", roomId, "reservationId", reservation)),
                "Initial physical room assignment", UUID.randomUUID()));
        return new Result(property, reservation, stayId, roomId, room.getCode());
    }

    private ReservationStay target(AuthorizedPropertyScope scope, UUID reservation, UUID stayId, boolean lock) {
        var stay = (lock ? stays.lockInScope(scope, stayId) : stays.findByIdInScope(scope, stayId))
                .orElseThrow(() -> new ReservationQueryException("Stay not found"));
        if (!stay.getReservation().getId().equals(reservation)) throw new ReservationQueryException("Stay not found");
        return stay;
    }
    private boolean eligible(ReservationStay stay) {
        return stay.getRoomId() == null && stay.getStatus() == ReservationStay.Status.RESERVED
                && stay.getReservation().getStatus() != Reservation.Status.CANCELLED;
    }
    private boolean available(AuthorizedPropertyScope scope, ReservationStay stay, Room room) {
        return stays.countRoomConflicts(scope, stay.getPropertyId(), room.getId(), stay.getArrival(), stay.getDeparture()) == 0
                && blocks.findAllInScope(scope).stream().noneMatch(b -> b.getRoomId().equals(room.getId())
                    && b.getReleasedAt() == null && b.getStartDate().isBefore(stay.getDeparture())
                    && b.getEndDate().isAfter(stay.getArrival()));
    }
    public static class Conflict extends RuntimeException { }
    @io.swagger.v3.oas.annotations.media.Schema(name = "StaffRoomAssignmentCandidate")
    public record Candidate(UUID room_id, String number, @io.swagger.v3.oas.annotations.media.Schema(types = {"string", "null"}) String floor,
            @io.swagger.v3.oas.annotations.media.Schema(allowableValues = {"ACTIVE"}, description = "No unreleased OOO/OOS overlapping the stay") String operational_status,
            boolean selectable, @io.swagger.v3.oas.annotations.media.Schema(types = {"string", "null"}) String reason) { }
    @io.swagger.v3.oas.annotations.media.Schema(name = "StaffRoomAssignmentPreview")
    public record Preview(UUID property_id, UUID reservation_id, UUID stay_id, LocalDate arrival, LocalDate departure,
            UUID room_type_id, String room_type, boolean can_assign, @io.swagger.v3.oas.annotations.media.Schema(types = {"string", "null"}) String reason, List<Candidate> rooms) { }
    @io.swagger.v3.oas.annotations.media.Schema(name = "StaffRoomAssignmentResult")
    public record Result(UUID property_id, UUID reservation_id, UUID stay_id, UUID room_id, String number) { }
}
