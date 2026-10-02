package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.domain.Room;
import java.time.Instant;
import java.util.UUID;

public record RoomView(UUID id, UUID propertyId, UUID roomTypeId, String code, Instant createdAt, Instant updatedAt) {
    static RoomView from(Room room) {
        return new RoomView(room.getId(), room.getPropertyId(), room.getRoomTypeId(), room.getCode(), room.getCreatedAt(), room.getUpdatedAt());
    }
}
