package com.pms.hotelboutique.backend.modules.inventory.application;

import java.time.ZoneId;
import java.util.Objects;

/** Converts hotel-local calendar nights to their exact UTC query boundaries. */
public final class PropertyStayTime {
    private PropertyStayTime() { }

    public static UtcStayInstantRange toUtc(StayDateRange dates, ZoneId propertyZone) {
        Objects.requireNonNull(dates, "dates");
        Objects.requireNonNull(propertyZone, "propertyZone");
        return new UtcStayInstantRange(
                dates.arrival().atStartOfDay(propertyZone).toInstant(),
                dates.departure().atStartOfDay(propertyZone).toInstant());
    }
}
