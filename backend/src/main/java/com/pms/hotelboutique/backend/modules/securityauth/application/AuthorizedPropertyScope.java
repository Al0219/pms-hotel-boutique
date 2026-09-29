package com.pms.hotelboutique.backend.modules.securityauth.application;

import java.util.Set;
import java.util.UUID;

/**
 * Property IDs already authorized for one request. Repositories must use this
 * set in their database predicate; they must not query every property first.
 */
public record AuthorizedPropertyScope(UUID organizationId, Type type, Set<UUID> propertyIds) {
    public enum Type { PROPERTY, ALL_PROPERTIES }

    public AuthorizedPropertyScope {
        propertyIds = Set.copyOf(propertyIds);
        if (propertyIds.isEmpty()) {
            throw new IllegalArgumentException("An authorized property scope cannot be empty");
        }
    }
}
