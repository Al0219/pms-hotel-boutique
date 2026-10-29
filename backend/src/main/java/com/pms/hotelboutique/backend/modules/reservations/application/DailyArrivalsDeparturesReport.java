package com.pms.hotelboutique.backend.modules.reservations.application;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Schema(description = "Pendientes actuales por fecha programada; no movimientos efectivos ni snapshot histórico.")
public record DailyArrivalsDeparturesReport(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant calculatedAt,
        @ArraySchema(maxItems = 50000, arraySchema = @Schema(requiredMode = Schema.RequiredMode.REQUIRED),
                schema = @Schema(implementation = Day.class)) List<Day> rows) {

    @Schema(name = "ArrivalsDeparturesDay")
    public record Day(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID propertyId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String timezone,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Moneda de la property; no importes financieros.") String currency,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Día local de arrival/departure, inclusivo.") LocalDate date,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0", description = "Stays RESERVED con arrival en este día y padre no cancelado.") long pendingArrivals,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0", description = "Stays RESERVED/IN_HOUSE con departure en este día y padre no cancelado.") long pendingDepartures) { }
}
