package com.pms.hotelboutique.backend.modules.inventory.application;

import java.time.Instant;
import java.util.Objects;

/** UTC boundaries corresponding to a property-local stay range. */
public record UtcStayInstantRange(Instant arrivalInclusive, Instant departureExclusive) {
    public UtcStayInstantRange {
        Objects.requireNonNull(arrivalInclusive, "arrivalInclusive");
        Objects.requireNonNull(departureExclusive, "departureExclusive");
        if (!arrivalInclusive.isBefore(departureExclusive)) {
            throw new IllegalArgumentException("arrivalInclusive must precede departureExclusive");
        }
    }
}
