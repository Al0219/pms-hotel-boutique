package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.domain.RoomType;
import java.time.Instant;
import java.util.UUID;

public record RoomTypeView(UUID id, UUID propertyId, String code, String name, Instant createdAt, Instant updatedAt) {
    static RoomTypeView from(RoomType type) {
        return new RoomTypeView(type.getId(), type.getPropertyId(), type.getCode(), type.getName(),
                type.getCreatedAt(), type.getUpdatedAt());
    }
}
