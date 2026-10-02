package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.domain.Reservation;
import java.time.Instant;
import java.util.UUID;

/** Read model for a {@code Reservation}. Entities are never exposed directly. */
public record ReservationView(
        UUID id,
        UUID propertyId,
        UUID bookingGuestId,
        String confirmationCode,
        Reservation.Status status,
        String currency,
        String sourceChannel,
        String sourceReference,
        String notes,
        UUID groupId,
        UUID roomBlockId,
        Instant createdAt,
        Instant updatedAt) {

    public static ReservationView from(Reservation reservation) {
        UUID bookingGuestId = reservation.getBookingGuest() == null
                ? null
                : reservation.getBookingGuest().getId();
        return new ReservationView(
                reservation.getId(),
                reservation.getPropertyId(),
                bookingGuestId,
                reservation.getConfirmationCode(),
                reservation.getStatus(),
                reservation.getCurrency(),
                reservation.getSourceChannel(),
                reservation.getSourceReference(),
                reservation.getNotes(),
                reservation.getGroupId(),
                reservation.getRoomBlockId(),
                reservation.getCreatedAt(),
                reservation.getUpdatedAt());
    }
}
