package com.pms.hotelboutique.backend.modules.inventory.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.util.UUID;

public record AvailabilityResponse(
        UUID propertyId,
        UUID roomTypeId,
        @Schema(description = "Inclusive arrival date in the property's local timezone", example = "2026-11-01") LocalDate arrival,
        @Schema(description = "Exclusive departure date in the property's local timezone", example = "2026-11-03") LocalDate departure,
        @Schema(description = "Minimum sellable units across all requested nights; does not reserve stock", minimum = "0") int availableUnits) {
}
