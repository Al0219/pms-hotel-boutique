package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.domain.RoomType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;
public record RoomTypeView(@Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "ID de tipo.") UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Propiedad del recurso.") UUID propertyId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Código del tipo.") String code,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Nombre del tipo.") String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Creación UTC.") Instant createdAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, accessMode = Schema.AccessMode.READ_ONLY, description = "Última actualización UTC.") Instant updatedAt) {
    static RoomTypeView from(RoomType type) {
        return new RoomTypeView(type.getId(), type.getPropertyId(), type.getCode(), type.getName(),
                type.getCreatedAt(), type.getUpdatedAt());
    }
}
