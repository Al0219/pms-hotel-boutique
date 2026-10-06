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
    private static final Map<String, Long> NIGHTLY_MINOR_UNITS = Map.of(
            "STANDARD", 65000L,
            "CLASSIC", 65000L,
            "STD", 65000L,
            "KING", 65000L,
            "TWIN", 65000L,
            "DELUXE", 85000L,
            "DLX", 85000L,
            "SUITE", 120000L);

    public MonetaryAmount rateFor(RoomType roomType) {
        Objects.requireNonNull(roomType, "roomType");
        Long minorUnits = NIGHTLY_MINOR_UNITS.get(roomType.getCode());
        if (minorUnits == null) {
            throw new DemoRateNotConfiguredException(roomType.getCode());
        }
        return new MonetaryAmount(new MinorUnits(minorUnits), GTQ);
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
