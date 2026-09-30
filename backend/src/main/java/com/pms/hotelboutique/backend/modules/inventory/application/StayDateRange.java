package com.pms.hotelboutique.backend.modules.inventory.application;

import java.time.LocalDate;
import java.util.Objects;

/** Property-local nights: arrival is inclusive, departure is exclusive. */
public record StayDateRange(LocalDate arrival, LocalDate departure) {
    public StayDateRange {
        Objects.requireNonNull(arrival, "arrival");
        Objects.requireNonNull(departure, "departure");
        if (!arrival.isBefore(departure)) {
            throw new IllegalArgumentException("arrival must precede departure");
        }
    }
}
