package com.pms.hotelboutique.backend.modules.guestauth.application;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import io.swagger.v3.oas.annotations.media.Schema;

/** Account ownership must be part of the database query, never a post-query filter. */
public interface GuestReservationReadPort {
    List<LinkedStay> list(UUID accountId);
    Optional<Stay> find(UUID accountId, UUID reservationId, UUID stayId);

    @Schema(name = "GuestLinkedStay")
    record LinkedStay(UUID reservationId, UUID stayId, String confirmationCode,
            String propertyName, String reservationStatus, LocalDate arrival, LocalDate departure,
            @Schema(nullable = true) String roomCode, String status) { }

    @Schema(name = "GuestStay")
    record Stay(UUID id, UUID reservationId, String confirmationCode, RoomType roomType,
            @Schema(nullable = true) Room room, LocalDate arrival, LocalDate departure, String status) { }
    @Schema(name = "GuestStayRoomType")
    record RoomType(UUID id, String name) { }
    @Schema(name = "GuestStayRoom")
    record Room(UUID id, String code) { }
}
