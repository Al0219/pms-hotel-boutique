package com.pms.hotelboutique.backend.shared.money.persistence;

import com.pms.hotelboutique.backend.shared.money.MinorUnits;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Apply explicitly to the amount component; persist currency separately. */
@Converter
public class MinorUnitsConverter implements AttributeConverter<MinorUnits, Long> {
    @Override
    public Long convertToDatabaseColumn(MinorUnits value) {
        return value == null ? null : value.value();
    }

    @Override
    public MinorUnits convertToEntityAttribute(Long value) {
        return value == null ? null : new MinorUnits(value);
    }
}
