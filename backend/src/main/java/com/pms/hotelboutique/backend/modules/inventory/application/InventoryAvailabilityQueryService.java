package com.pms.hotelboutique.backend.modules.inventory.application;

import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

@Service
public class InventoryAvailabilityQueryService {
    private final AvailabilityPort availability;

    public InventoryAvailabilityQueryService(AvailabilityPort availability) {
        this.availability = availability;
    }

    @PreAuthorize("@inventoryAccess.canRead(authentication, #propertyId)")
    public int calculate(UUID propertyId, UUID roomTypeId, StayDateRange dates) {
        try {
            return availability.calculateATS(propertyId, roomTypeId, dates);
        } catch (IllegalArgumentException exception) {
            throw new InventoryNotFoundException();
        }
    }
}
