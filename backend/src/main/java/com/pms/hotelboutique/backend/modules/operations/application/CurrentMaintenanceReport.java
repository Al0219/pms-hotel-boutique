package com.pms.hotelboutique.backend.modules.operations.application;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Schema(description = "Fotografía de órdenes de mantenimiento sin resolver por property; sin historia ni SLA.")
public record CurrentMaintenanceReport(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant calculatedAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<PropertyRow> rows) {

    @Schema(name = "CurrentMaintenanceProperty")
    public record PropertyRow(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID propertyId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String timezone,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0") long openOrders,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0") long inProgressOrders,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0") long unresolvedOrders,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0", description = "Subconjunto de órdenes sin resolver.") long urgentUnresolvedOrders,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0", description = "Subconjunto de órdenes sin resolver.") long unassignedUnresolvedOrders,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0") long roomLinkedUnresolvedOrders,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0") long commonAreaUnresolvedOrders) { }
}
