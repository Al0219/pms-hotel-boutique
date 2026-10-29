package com.pms.hotelboutique.backend.modules.operations.application;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Schema(description = "Fotografía actual de housekeeping por property; sin actividad histórica ni disponibilidad vendible.")
public record CurrentHousekeepingReport(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant calculatedAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<PropertyRow> rows) {

    @Schema(name = "CurrentHousekeepingProperty")
    public record PropertyRow(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID propertyId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String timezone,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0") long physicalRooms,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0") long trackedRooms,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0", description = "Sin fila HK; estado desconocido, no DIRTY implícito.") long untrackedRooms,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0") long dirtyRooms,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0") long cleanRooms,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0") long inspectedRooms,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0", description = "Indicador transversal entre habitaciones seguidas.") long dndRooms) { }
}
