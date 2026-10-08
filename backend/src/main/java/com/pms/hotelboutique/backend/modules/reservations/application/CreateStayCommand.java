package com.pms.hotelboutique.backend.modules.reservations.application;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

/** Input for adding a stay to an existing Reservation. No REST contract implied. */
public record CreateStayCommand(
        @NotNull UUID reservationId,
        @NotNull UUID roomTypeId,
        UUID roomId,
        @NotNull LocalDate arrival,
        @NotNull LocalDate departure) {
}
