package com.pms.hotelboutique.backend.shared.money;

import com.pms.hotelboutique.backend.shared.money.persistence.CurrencyConverter;
import com.pms.hotelboutique.backend.shared.money.persistence.MinorUnitsConverter;
import java.math.BigDecimal;
import java.util.Currency;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MonetaryAmountTests {
    private static final Currency GTQ = Currency.getInstance("GTQ");

    @Test
    void preservesDecimalExactlyThroughPersistenceConverters() {
        var value = MonetaryAmount.of(new BigDecimal("1234.56"), GTQ);
        var units = new MinorUnitsConverter();
        var currencies = new CurrencyConverter();
        assertEquals(123456L, units.convertToDatabaseColumn(value.minorUnits()));
        var restored = new MonetaryAmount(units.convertToEntityAttribute(123456L),
                currencies.convertToEntityAttribute(currencies.convertToDatabaseColumn(GTQ)));
        assertEquals(value, restored);
        assertEquals(new BigDecimal("1234.56"), restored.amount());
        assertEquals(new BigDecimal("0.30"), MonetaryAmount.of(new BigDecimal("0.10"), GTQ)
                .plus(MonetaryAmount.of(new BigDecimal("0.20"), GTQ)).amount());
    }

    @Test
    void respectsCurrencyScaleInsteadOfAssumingCents() {
        assertEquals(123L, MonetaryAmount.of(new BigDecimal("123"), Currency.getInstance("JPY"))
                .minorUnits().value());
        assertEquals(1234L, MonetaryAmount.of(new BigDecimal("1.234"), Currency.getInstance("KWD"))
                .minorUnits().value());
        assertThrows(ArithmeticException.class, () -> MonetaryAmount.of(new BigDecimal("1.1"),
                Currency.getInstance("JPY")));
    }

    @Test
    void rejectsRoundingOverflowAndMixedCurrencies() {
        assertThrows(ArithmeticException.class, () -> MonetaryAmount.of(new BigDecimal("0.001"), GTQ));
        assertThrows(ArithmeticException.class, () -> MonetaryAmount.of(new BigDecimal("92233720368547758.08"), GTQ));
        var max = new MonetaryAmount(new MinorUnits(Long.MAX_VALUE), GTQ);
        assertThrows(ArithmeticException.class, () -> max.plus(new MonetaryAmount(new MinorUnits(1), GTQ)));
        assertThrows(IllegalArgumentException.class, () -> max.plus(
                new MonetaryAmount(new MinorUnits(1), Currency.getInstance("USD"))));
        assertThrows(IllegalArgumentException.class, () -> new MonetaryAmount(new MinorUnits(1), Currency.getInstance("XXX")));
        assertEquals(-1L, MonetaryAmount.of(new BigDecimal("-0.01"), GTQ).minorUnits().value());
    }

    @Test
    void convertersHandleNullAndRejectInvalidCurrency() {
        var units = new MinorUnitsConverter();
        var currencies = new CurrencyConverter();
        assertNull(units.convertToDatabaseColumn(null));
        assertNull(units.convertToEntityAttribute(null));
        assertNull(currencies.convertToDatabaseColumn(null));
        assertNull(currencies.convertToEntityAttribute(null));
        assertThrows(IllegalArgumentException.class, () -> currencies.convertToEntityAttribute("INVALID"));
    }
}
