package com.pms.hotelboutique.backend.shared.money.persistence;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.Currency;

@Converter
public class CurrencyConverter implements AttributeConverter<Currency, String> {
    @Override
    public String convertToDatabaseColumn(Currency value) {
        return value == null ? null : value.getCurrencyCode();
    }

    @Override
    public Currency convertToEntityAttribute(String value) {
        return value == null ? null : Currency.getInstance(value);
    }
}
