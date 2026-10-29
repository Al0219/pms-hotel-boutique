package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.*;
import com.pms.hotelboutique.backend.modules.operations.application.HousekeepingException;
import com.pms.hotelboutique.backend.modules.operations.application.RoomReadinessService;
import com.pms.hotelboutique.backend.modules.reservations.domain.Reservation;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationStay;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.*;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import jakarta.persistence.EntityManager;
import java.time.*;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Authorized Staff lifecycle; legacy UUID primitives remain internal only. */
@Service
public class StaffStayLifecycleService {
    private final StaffReservationReadService access;
    private final LocalOperationService operations;
    private final FolioTransactionGuard financialGuard;
    private final ReservationRepository reservations;
    private final ReservationStayRepository stays;
    private final RoomRepository rooms;
    private final PropertyRepository properties;
    private final OutOfOrderRepository blocks;
    private final FolioRepository folios;
    private final FolioMovementRepository movements;
    private final RoomReadinessService readiness;
    private final ReservationStayService travel;
    private final EntityManager entities;

    public StaffStayLifecycleService(StaffReservationReadService access, LocalOperationService operations,
            FolioTransactionGuard financialGuard, ReservationRepository reservations, ReservationStayRepository stays,
            RoomRepository rooms, PropertyRepository properties, OutOfOrderRepository blocks, FolioRepository folios,
            FolioMovementRepository movements, RoomReadinessService readiness, ReservationStayService travel,
            EntityManager entities) {
        this.access = access; this.operations = operations; this.financialGuard = financialGuard;
        this.reservations = reservations; this.stays = stays; this.rooms = rooms; this.properties = properties;
        this.blocks = blocks; this.folios = folios; this.movements = movements; this.readiness = readiness;
        this.travel = travel; this.entities = entities;
    }

    @Transactional
    public Result checkIn(StaffPrincipal principal, UUID propertyId, UUID reservationId, UUID stayId,
            String key, Expectation expected) {
        return execute(principal, propertyId, reservationId, stayId, key, expected, true);
    }

    @Transactional
    public Result checkOut(StaffPrincipal principal, UUID propertyId, UUID reservationId, UUID stayId,
            String key, Expectation expected) {
        return execute(principal, propertyId, reservationId, stayId, key, expected, false);
    }

    private Result execute(StaffPrincipal principal, UUID propertyId, UUID reservationId, UUID stayId,
            String key, Expectation expected, boolean arrival) {
        if (reservationId == null || stayId == null || expected == null || expected.updatedAt() == null
                || expected.status() != (arrival ? ReservationStay.Status.RESERVED : ReservationStay.Status.IN_HOUSE))
            throw new IllegalArgumentException("invalid lifecycle expectation");
        access.authorize(principal, propertyId);
        var request = new LocalOperationRequest(key, 1, Map.of("reservationId", reservationId.toString(),
                "stayId", stayId.toString(), "status", expected.status().name(),
                "updatedAt", expected.updatedAt().toString(),
                "roomId", expected.roomId() == null ? "null" : expected.roomId().toString()));
        var receipt = operations.execute(principal, propertyId, new LocalOperationService.OperationDefinition(
                arrival ? "STAFF_STAY_CHECK_IN" : "STAFF_STAY_CHECK_OUT", "RESERVATION_MANAGE"), request, context -> {
            // Shared with every linked-folio writer, including creation: no phantom debt between check and commit.
            financialGuard.lock(propertyId, reservationId);
            var reservation = reservations.lockByIdInScope(context.scope(), reservationId)
                    .orElseThrow(() -> new ReservationQueryException("Reservation not found"));
            entities.refresh(reservation);
            var stay = stays.lockInScope(context.scope(), stayId)
                    .filter(s -> s.getReservation().getId().equals(reservationId))
                    .orElseThrow(() -> new ReservationQueryException("Stay not found"));
            entities.refresh(stay);
            if (stay.getStatus() != expected.status() || !stay.getUpdatedAt().equals(expected.updatedAt())
                    || !Objects.equals(stay.getRoomId(), expected.roomId())) throw new Conflict("STALE_STAY");
            if (arrival) {
                requireArrival(context, reservation, stay);
                travel.checkInAsStaff(stayId, context.actorId(), context.operationId());
            } else {
                requireNoDebt(propertyId, reservationId);
                travel.checkOutAsStaff(stayId, context.actorId(), context.operationId());
            }
            entities.flush();
            return stayId;
        });
        return new Result(receipt.operationId(), propertyId, reservationId, receipt.resultId(),
                arrival ? "IN_HOUSE" : "CHECKED_OUT", receipt.completedAt());
    }

    private void requireArrival(LocalOperationService.OperationContext context, Reservation reservation,
            ReservationStay stay) {
        if (reservation.getStatus() != Reservation.Status.CONFIRMED) throw new Conflict("RESERVATION_NOT_CONFIRMED");
        var property = properties.findByIdInScope(context.scope(), stay.getPropertyId())
                .orElseThrow(() -> new ReservationQueryException("Property not found"));
        LocalDate today = LocalDate.now(ZoneId.of(property.getTimezone()));
        if (today.isBefore(stay.getArrival()) || !today.isBefore(stay.getDeparture()))
            throw new Conflict("OUTSIDE_ARRIVAL_DATES");
        if (stay.getRoomId() == null) throw new Conflict("ROOM_NOT_ASSIGNED");
        var room = rooms.lockInProperty(context.scope(), stay.getPropertyId(), stay.getRoomId())
                .orElseThrow(() -> new ReservationQueryException("Room not found"));
        entities.refresh(room);
        if (!room.getRoomTypeId().equals(stay.getRoomTypeId())) throw new Conflict("ROOM_TYPE_MISMATCH");
        if (stays.countOtherRoomConflicts(context.scope(), stay.getPropertyId(), stay.getId(), room.getId(),
                stay.getArrival(), stay.getDeparture()) != 0) throw new Conflict("ROOM_UNAVAILABLE");
        if (blocks.findAllInScope(context.scope()).stream().anyMatch(b -> b.getRoomId().equals(room.getId())
                && b.getReleasedAt() == null && b.getStartDate().isBefore(stay.getDeparture())
                && b.getEndDate().isAfter(stay.getArrival()))) throw new Conflict("ROOM_BLOCKED");
        try { readiness.requireInspected(stay.getPropertyId(), room.getId()); }
        catch (HousekeepingException e) { throw new Conflict("ROOM_NOT_INSPECTED"); }
    }

    private void requireNoDebt(UUID propertyId, UUID reservationId) {
        var linked = folios.findByReservation_IdAndPropertyId(reservationId, propertyId);
        if (linked.isEmpty()) throw new Conflict("BALANCE_UNVERIFIABLE");
        for (var folio : linked) {
            if (movements.countByFolio_Id(folio.getId()) == 0) throw new Conflict("BALANCE_UNVERIFIABLE");
            if (movements.sumByFolioId(folio.getId()) > 0) throw new Conflict("OUTSTANDING_BALANCE");
        }
    }

    public record Expectation(ReservationStay.Status status, Instant updatedAt, UUID roomId) { }
    @io.swagger.v3.oas.annotations.media.Schema(name = "StaffStayLifecycleResult")
    public record Result(UUID operationId, UUID propertyId, UUID reservationId, UUID stayId,
            @io.swagger.v3.oas.annotations.media.Schema(allowableValues = {"IN_HOUSE", "CHECKED_OUT"}) String status,
            Instant completedAt) { }
    public static class Conflict extends RuntimeException {
        private final String code;
        public Conflict(String code) { super(code); this.code = code; }
        public String code() { return code; }
    }
}
