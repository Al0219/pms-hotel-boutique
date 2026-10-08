package com.pms.hotelboutique.backend.modules.commercial.application;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;
import java.util.UUID;

/** Input for holding block units. No REST contract is implied. */
public record CreateRoomBlockCommand(
        @NotNull UUID groupId,
        @NotNull UUID propertyId,
        @NotNull UUID roomTypeId,
        @NotNull LocalDate arrival,
        @NotNull LocalDate departure,
        @Positive int unitsHeld) {
}
