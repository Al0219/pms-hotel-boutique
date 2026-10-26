package com.pms.hotelboutique.backend.modules.guestauth.application;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Every projection must be authorized in SQL by the persisted Guest reservation link. */
public interface GuestReservationHistoryPort {
    Page readPage(UUID accountId, int page, int size);
    Optional<Reservation> readOne(UUID accountId, UUID reservationId);

    record Page(long totalElements, List<Reservation> items) { }
    record Reservation(UUID reservationId, String confirmationCode, String status,
            UUID propertyId, String propertyName, String propertyTimeZone, String bookingGuestName,
            List<Stay> stays) { }
    record Stay(UUID reservationStayId, UUID roomTypeId, String roomTypeName,
            LocalDate arrival, LocalDate departure, String status) { }
}
