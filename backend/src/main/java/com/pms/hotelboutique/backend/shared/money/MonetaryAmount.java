package com.pms.hotelboutique.backend.shared.money;

import java.math.BigDecimal;
import java.util.Currency;
import java.util.Objects;

/** Immutable monetary value, with no implicit rounding or floating point. */
public record MonetaryAmount(MinorUnits minorUnits, Currency currency) {
    public MonetaryAmount {
        Objects.requireNonNull(minorUnits, "minorUnits");
        Objects.requireNonNull(currency, "currency");
        if (currency.getDefaultFractionDigits() < 0) {
            throw new IllegalArgumentException("Currency must define minor units");
        }
    }

    public static MonetaryAmount of(BigDecimal amount, Currency currency) {
        Objects.requireNonNull(amount, "amount");
        Objects.requireNonNull(currency, "currency");
        if (currency.getDefaultFractionDigits() < 0) {
            throw new IllegalArgumentException("Currency must define minor units");
        }
        return new MonetaryAmount(new MinorUnits(amount
                .movePointRight(currency.getDefaultFractionDigits()).longValueExact()), currency);
    }

    public BigDecimal amount() {
        return BigDecimal.valueOf(minorUnits.value(), currency.getDefaultFractionDigits());
    }

    public MonetaryAmount plus(MonetaryAmount other) {
        Objects.requireNonNull(other, "other");
        if (!currency.equals(other.currency)) {
            throw new IllegalArgumentException("Cannot add different currencies");
        }
        return new MonetaryAmount(new MinorUnits(Math.addExact(minorUnits.value(),
                other.minorUnits.value())), currency);
    }
}
