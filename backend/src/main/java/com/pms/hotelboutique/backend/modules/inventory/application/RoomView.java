package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.domain.Room;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;
public record RoomView(@Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "ID de habitación física.") UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Propiedad del recurso.") UUID propertyId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Tipo de la misma propiedad.") UUID roomTypeId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Código de habitación.") String code,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Creación UTC.") Instant createdAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Última actualización UTC.") Instant updatedAt) {
    static RoomView from(Room room) {
        return new RoomView(room.getId(), room.getPropertyId(), room.getRoomTypeId(), room.getCode(), room.getCreatedAt(), room.getUpdatedAt());
    }
}
