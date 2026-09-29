package com.pms.hotelboutique.backend.modules.securityauth.application;

import java.util.Set;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
public class PropertyScopeResolver {
    private static final String MULTI_PROPERTY_READ = "MULTI_PROPERTY_READ";

    public AuthorizedPropertyScope resolveProperty(StaffAuthorizationSnapshot authorization, UUID propertyId) {
        if (propertyId == null) {
            throw new IllegalArgumentException("propertyId is required for a PROPERTY scope");
        }
        boolean allowed = authorization.properties().stream()
                .anyMatch(property -> property.propertyId().equals(propertyId));
        if (!allowed) {
            throw new AccessDeniedException("The active Staff session is not authorized for this property");
        }
        return new AuthorizedPropertyScope(authorization.organizationId(),
                AuthorizedPropertyScope.Type.PROPERTY, Set.of(propertyId));
    }

    public AuthorizedPropertyScope resolveAllProperties(StaffAuthorizationSnapshot authorization) {
        boolean canReadPortfolio = "SUPER_ADMIN".equals(authorization.roleCode())
                || authorization.hasPermission(MULTI_PROPERTY_READ);
        if (!canReadPortfolio) {
            throw new AccessDeniedException("ALL_PROPERTIES requires MULTI_PROPERTY_READ");
        }
        Set<UUID> authorizedPropertyIds = authorization.properties().stream()
                .map(StaffAuthorizationSnapshot.PropertyAccess::propertyId)
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
        return new AuthorizedPropertyScope(authorization.organizationId(),
                AuthorizedPropertyScope.Type.ALL_PROPERTIES, authorizedPropertyIds);
    }
}
