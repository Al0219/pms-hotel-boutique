package com.pms.hotelboutique.backend.modules.inventory.application;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
/** Current on-books position by property-local stay night, not realized occupancy. */
public record DailyOnBooksReport(Instant calculatedAt, List<Night> nights) {
    public DailyOnBooksReport {
        nights = List.copyOf(nights);
    }

    public record Night(@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID propertyId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String timezone,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String currency,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LocalDate stayDate,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) long physicalRooms,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) long outOfOrderRooms,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) long availableRooms,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) long onBooksRooms,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, nullable = true, description = "Porcentaje a 2 decimales; puede exceder 100. NULL cuando availableRooms=0.") BigDecimal onBooksPercent,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, nullable = true, allowableValues = "NO_AVAILABLE_ROOMS", description = "NO_AVAILABLE_ROOMS si denominador cero; NULL en otro caso.") String unavailableReason) { }
}
