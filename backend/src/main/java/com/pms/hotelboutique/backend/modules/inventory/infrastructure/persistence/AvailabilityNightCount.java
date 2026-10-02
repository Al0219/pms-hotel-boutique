package com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence;

import java.time.LocalDate;

/** Physical, OOO and reservation counts for one property-local night. */
public record AvailabilityNightCount(LocalDate night, long physicalRooms,
        long outOfOrderRooms, long reservedStays) { }
