package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.commercial.domain.RoomBlock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Read model for a {@code RoomBlock} with derived pickup.
 * Entities are never exposed directly.
 */
public record RoomBlockView(
        UUID id,
        UUID groupId,
        UUID propertyId,
        UUID roomTypeId,
        LocalDate arrival,
        LocalDate departure,
        int unitsHeld,
        int pickupUnits,
        int remainingUnits,
        RoomBlock.Status status,
        Instant createdAt,
        Instant updatedAt) {

    public static RoomBlockView from(RoomBlock block, int pickupUnits) {
        return new RoomBlockView(
                block.getId(),
                block.getGroupId(),
                block.getPropertyId(),
                block.getRoomTypeId(),
                block.getArrival(),
                block.getDeparture(),
                block.getUnitsHeld(),
                pickupUnits,
                block.getUnitsHeld() - pickupUnits,
                block.getStatus(),
                block.getCreatedAt(),
                block.getUpdatedAt());
    }
}
