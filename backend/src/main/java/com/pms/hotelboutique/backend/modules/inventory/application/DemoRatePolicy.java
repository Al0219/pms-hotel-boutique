package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.domain.RoomType;
import com.pms.hotelboutique.backend.shared.money.MinorUnits;
import com.pms.hotelboutique.backend.shared.money.MonetaryAmount;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Currency;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;

/** Temporary authoritative GTQ prices shared by public availability and booking. */
@Service
public class DemoRatePolicy {
    private static final Currency GTQ = Currency.getInstance("GTQ");
    private enum DemoRate {
        DEMO_STANDARD(65000L), DEMO_DELUXE(85000L), DEMO_SUITE(120000L);

        private final long nightlyMinorUnits;

        DemoRate(long nightlyMinorUnits) { this.nightlyMinorUnits = nightlyMinorUnits; }
    }

    private static final Map<String, DemoRate> RATES = Map.of(
            "STANDARD", DemoRate.DEMO_STANDARD,
            "CLASSIC", DemoRate.DEMO_STANDARD,
            "STD", DemoRate.DEMO_STANDARD,
            "KING", DemoRate.DEMO_STANDARD,
            "TWIN", DemoRate.DEMO_STANDARD,
            "DELUXE", DemoRate.DEMO_DELUXE,
            "DLX", DemoRate.DEMO_DELUXE,
            "SUITE", DemoRate.DEMO_SUITE);

    public Currency currency() { return GTQ; }

    /** Stable demo identity, shared as ratePlanId and ratePlanCode; never a persisted UUID. */
    public String ratePlanCodeFor(RoomType roomType) { return configuredRate(roomType).name(); }

    public MonetaryAmount rateFor(RoomType roomType) {
        return new MonetaryAmount(new MinorUnits(configuredRate(roomType).nightlyMinorUnits), GTQ);
    }

    private DemoRate configuredRate(RoomType roomType) {
        Objects.requireNonNull(roomType, "roomType");
        DemoRate rate = RATES.get(roomType.getCode());
        if (rate == null) {
            throw new DemoRateNotConfiguredException(roomType.getCode());
        }
        return rate;
    }

    /** Arrival inclusive, departure exclusive; no taxes, discounts or promotions. */
    public MonetaryAmount totalFor(RoomType roomType, LocalDate arrival, LocalDate departure) {
        StayDateRange dates = new StayDateRange(arrival, departure);
        long nights = ChronoUnit.DAYS.between(dates.arrival(), dates.departure());
        MonetaryAmount nightlyRate = rateFor(roomType);
        return new MonetaryAmount(new MinorUnits(Math.multiplyExact(
                nightlyRate.minorUnits().value(), nights)), nightlyRate.currency());
    }
}
