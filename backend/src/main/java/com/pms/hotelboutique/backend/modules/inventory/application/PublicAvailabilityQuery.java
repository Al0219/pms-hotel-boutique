package com.pms.hotelboutique.backend.modules.inventory.application;

import java.time.LocalDate;
import java.util.UUID;

public record PublicAvailabilityQuery(UUID propertyId, LocalDate arrival,
        LocalDate departure, int roomsRequested) {
    public PublicAvailabilityQuery {
        if (propertyId == null || arrival == null || departure == null) {
            throw new IllegalArgumentException("propertyId, arrival and departure are required");
        }
        new StayDateRange(arrival, departure);
        if (roomsRequested <= 0) {
            throw new IllegalArgumentException("roomsRequested must be positive");
        }
    }
}
