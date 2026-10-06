package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.domain.RoomType;
import com.pms.hotelboutique.backend.shared.money.MinorUnits;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;

class DemoRatePolicyTests {
    private final DemoRatePolicy policy = new DemoRatePolicy();
    private final LocalDate arrival = LocalDate.of(2026, 10, 6);

    @ParameterizedTest
    @CsvSource({"STANDARD,65000,DEMO_STANDARD", "CLASSIC,65000,DEMO_STANDARD",
            "STD,65000,DEMO_STANDARD", "KING,65000,DEMO_STANDARD", "TWIN,65000,DEMO_STANDARD",
            "DELUXE,85000,DEMO_DELUXE", "DLX,85000,DEMO_DELUXE", "SUITE,120000,DEMO_SUITE"})
    void returnsExplicitNightlyRatesInGtq(String code, long expected, String ratePlanCode) {
        var rate = policy.rateFor(type(code));
        assertEquals(expected, rate.minorUnits().value());
        assertEquals("GTQ", rate.currency().getCurrencyCode());
        assertEquals(rate.currency(), policy.currency());
        assertEquals(ratePlanCode, policy.ratePlanCodeFor(type(code)));
    }

    @ParameterizedTest
    @CsvSource({"STD,1,65000", "DLX,3,255000", "SUITE,2,240000"})
    void calculatesExactTotalsInGtq(String code, long nights, long expected) {
        var total = policy.totalFor(type(code), arrival, arrival.plusDays(nights));
        assertEquals(expected, total.minorUnits().value());
        assertEquals("GTQ", total.currency().getCurrencyCode());
    }

    @Test
    void rejectsEqualDates() {
        assertThrows(IllegalArgumentException.class,
                () -> policy.totalFor(type("STD"), arrival, arrival));
    }

    @Test
    void rejectsReversedDates() {
        assertThrows(IllegalArgumentException.class,
                () -> policy.totalFor(type("STD"), arrival, arrival.minusDays(1)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"UNCONFIGURED", "SOLD", "JPA-ROOM", "deluxe", "DELUXE-KING"})
    void rejectsUnconfiguredCodesEvenWithKnownDisplayName(String code) {
        var roomType = type(code);
        var error = assertThrows(DemoRateNotConfiguredException.class,
                () -> policy.rateFor(roomType));
        assertEquals("DEMO_RATE_NOT_CONFIGURED: " + code, error.getMessage());
        assertThrows(DemoRateNotConfiguredException.class, () -> policy.ratePlanCodeFor(roomType));
        assertThrows(DemoRateNotConfiguredException.class,
                () -> policy.totalFor(roomType, arrival, arrival.plusDays(1)));
    }

    @Test
    void priceDependsOnCodeNotGeneratedIdsOrDisplayName() {
        var first = type("STD");
        var other = new RoomType(UUID.randomUUID(), UUID.randomUUID(), "STD", "Renamed", Instant.now());
        assertNotEquals(first.getId(), other.getId());
        assertEquals(policy.rateFor(first), policy.rateFor(other));
    }

    @Test
    void usesLongMinorUnitsWithExactLargeRangeArithmetic() {
        assertEquals(long.class, MinorUnits.class.getRecordComponents()[0].getType());
        long nights = LocalDate.MAX.toEpochDay() - LocalDate.MIN.toEpochDay();
        var total = policy.totalFor(type("SUITE"), LocalDate.MIN, LocalDate.MAX);
        assertEquals(Math.multiplyExact(120000L, nights), total.minorUnits().value());
        assertTrue(total.minorUnits().value() > (1L << 53));
        assertEquals("GTQ", total.currency().getCurrencyCode());
    }

    private RoomType type(String code) {
        return new RoomType(UUID.randomUUID(), UUID.randomUUID(), code, "Deluxe Suite", Instant.now());
    }
}
