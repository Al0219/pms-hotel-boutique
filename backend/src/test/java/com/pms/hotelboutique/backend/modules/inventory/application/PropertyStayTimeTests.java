package com.pms.hotelboutique.backend.modules.inventory.application;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PropertyStayTimeTests {
    @Test
    void convertsLocalNightBoundariesUsingPropertyZoneAcrossDaylightSaving() {
        var dates = new StayDateRange(LocalDate.of(2026, 3, 7), LocalDate.of(2026, 3, 9));

        var result = PropertyStayTime.toUtc(dates, ZoneId.of("America/New_York"));

        assertEquals(Instant.parse("2026-03-07T05:00:00Z"), result.arrivalInclusive());
        assertEquals(Instant.parse("2026-03-09T04:00:00Z"), result.departureExclusive());
        assertEquals(47 * 60 * 60, result.departureExclusive().getEpochSecond()
                - result.arrivalInclusive().getEpochSecond());
    }

    @Test
    void rejectsMissingInputs() {
        var date = LocalDate.of(2026, 9, 30);
        var range = new StayDateRange(date, date.plusDays(1));
        assertThrows(NullPointerException.class, () -> PropertyStayTime.toUtc(null, ZoneId.of("UTC")));
        assertThrows(NullPointerException.class, () -> PropertyStayTime.toUtc(range, null));
    }
}
