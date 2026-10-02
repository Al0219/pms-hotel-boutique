package com.pms.hotelboutique.backend.modules.inventory.application;

import java.util.Objects;
import java.util.UUID;

/** Units requested for every property-local night in dates. */
public record InventoryDemand(UUID roomTypeId, StayDateRange dates, int units) {
    public InventoryDemand {
        Objects.requireNonNull(roomTypeId, "roomTypeId");
        Objects.requireNonNull(dates, "dates");
        if (units < 1) {
            throw new IllegalArgumentException("units must be positive");
        }
    }
}
