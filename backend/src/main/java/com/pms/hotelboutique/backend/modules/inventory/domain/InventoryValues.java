package com.pms.hotelboutique.backend.modules.inventory.domain;

import java.util.Objects;

final class InventoryValues {
    private InventoryValues() { }

    static String text(String value, String field, int maxLength) {
        Objects.requireNonNull(value, field);
        if (value.isBlank() || value.length() > maxLength) {
            throw new IllegalArgumentException(field + " must be nonblank and at most " + maxLength + " characters");
        }
        return value;
    }
}
