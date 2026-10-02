package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.domain.Property;
import java.time.Instant;
import java.util.UUID;

public record PropertyView(UUID id, UUID organizationId, String code, String name,
        String timezone, String currency, Property.Status status, Instant createdAt, Instant updatedAt) {
    static PropertyView from(Property property) {
        return new PropertyView(property.getId(), property.getOrganizationId(), property.getCode(),
                property.getName(), property.getTimezone(), property.getCurrency().getCurrencyCode(),
                property.getStatus(), property.getCreatedAt(), property.getUpdatedAt());
    }
}
