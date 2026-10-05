package com.pms.hotelboutique.backend.modules.inventory.application;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Current on-books position by property-local stay night, not realized occupancy. */
public record DailyOnBooksReport(Instant calculatedAt, List<Night> nights) {
    public DailyOnBooksReport {
        nights = List.copyOf(nights);
    }

    public record Night(UUID propertyId, String timezone, String currency, LocalDate stayDate,
            long physicalRooms, long outOfOrderRooms, long availableRooms, long onBooksRooms,
            BigDecimal onBooksPercent, String unavailableReason) { }
}
