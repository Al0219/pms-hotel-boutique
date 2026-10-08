package com.pms.hotelboutique.backend.modules.inventory.api;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.util.UUID;
public record AvailabilityResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID propertyId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID roomTypeId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Inclusive arrival date in the property's local timezone", example = "2026-11-01") LocalDate arrival,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Exclusive departure date in the property's local timezone", example = "2026-11-03") LocalDate departure,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Minimum sellable units across all requested nights; does not reserve stock", minimum = "0") int availableUnits) {
}
