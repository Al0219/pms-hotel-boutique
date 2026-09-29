package com.pms.hotelboutique.backend.modules.securityauth.application;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public record StaffAuthorizationSnapshot(UUID organizationId, String roleCode, Set<String> permissions,
        List<PropertyAccess> properties) {
    public record PropertyAccess(UUID propertyId, String propertyCode, String propertyName, String timezone, String currency) { }
    public boolean hasPermission(String code) { return permissions.contains(code); }
}
