package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationGuest;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationStay;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Read models for stays and their occupants. Entities are never exposed directly. */
public record ReservationStayView(
        UUID id,
        UUID reservationId,
        UUID propertyId,
        UUID roomTypeId,
        UUID roomId,
        LocalDate arrival,
        LocalDate departure,
        ReservationStay.Status status,
        List<OccupantView> occupants,
        Instant createdAt,
        Instant updatedAt) {

    public record OccupantView(UUID linkId, UUID profileId, String fullName, boolean primary) {
        static OccupantView from(ReservationGuest link) {
            String fullName = link.getProfile().getFirstName() + " " + link.getProfile().getLastName();
            return new OccupantView(link.getId(), link.getProfile().getId(), fullName, link.isPrimary());
        }
    }

    public static ReservationStayView from(ReservationStay stay, List<ReservationGuest> occupants) {
        return new ReservationStayView(
                stay.getId(),
                stay.getReservation().getId(),
                stay.getPropertyId(),
                stay.getRoomTypeId(),
                stay.getRoomId(),
                stay.getArrival(),
                stay.getDeparture(),
                stay.getStatus(),
                occupants.stream().map(OccupantView::from).toList(),
                stay.getCreatedAt(),
                stay.getUpdatedAt());
    }
}
