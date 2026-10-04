package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.security.access.AccessDeniedException;

/** Authorization for internal commercial services. */
final class CommercialAuthorization {
    private CommercialAuthorization() { }

    static void requireManage(StaffAuthorizationSnapshot authorization) {
        if (authorization == null || authorization.permissions() == null
                || !authorization.hasPermission("COMMERCIAL_MANAGE")) {
            throw new AccessDeniedException("Commercial operations require COMMERCIAL_MANAGE");
        }
    }

    static AuthorizedPropertyScope requireScope(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope) {
        requireManage(authorization);
        if (scope == null || scope.propertyIds() == null || scope.propertyIds().isEmpty()) {
            throw new CommercialException("an explicit property scope is required");
        }
        Set<UUID> authorized = authorization.properties() == null ? Set.of()
                : authorization.properties().stream()
                        .map(StaffAuthorizationSnapshot.PropertyAccess::propertyId)
                        .collect(Collectors.toUnmodifiableSet());
        if (authorization.organizationId() == null
                || !authorization.organizationId().equals(scope.organizationId())
                || !authorized.containsAll(scope.propertyIds())) {
            throw new AccessDeniedException("The active Staff session is not authorized for this scope");
        }
        if (scope.type() == AuthorizedPropertyScope.Type.PROPERTY) {
            if (scope.propertyIds().size() != 1) {
                throw new AccessDeniedException("PROPERTY requires exactly one authorized property");
            }
        } else if (scope.type() == AuthorizedPropertyScope.Type.ALL_PROPERTIES) {
            if (!authorization.hasPermission("MULTI_PROPERTY_READ")
                    || !authorized.equals(scope.propertyIds())) {
                throw new AccessDeniedException("ALL_PROPERTIES requires MULTI_PROPERTY_READ and all authorized properties");
            }
        } else {
            throw new AccessDeniedException("Invalid property scope type");
        }
        return scope;
    }

    static AuthorizedPropertyScope requirePropertyScope(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope) {
        AuthorizedPropertyScope resolved = requireScope(authorization, scope);
        if (resolved.type() != AuthorizedPropertyScope.Type.PROPERTY) {
            throw new AccessDeniedException("Commercial writes require PROPERTY scope");
        }
        return resolved;
    }

    static void requireProperty(StaffAuthorizationSnapshot authorization, UUID propertyId) {
        requireManage(authorization);
        if (propertyId == null) {
            throw new CommercialException("property id is required");
        }
        if (authorization.properties() == null || authorization.properties().stream()
                .noneMatch(property -> property.propertyId().equals(propertyId))) {
            throw new AccessDeniedException("The active Staff session is not authorized for this property");
        }
    }
}
