package com.pms.hotelboutique.backend.modules.securityauth.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

class PropertyScopeResolverTests {
    private final PropertyScopeResolver resolver = new PropertyScopeResolver();
    private final UUID organizationId = UUID.randomUUID();
    private final UUID firstPropertyId = UUID.randomUUID();
    private final UUID secondPropertyId = UUID.randomUUID();

    @Test
    void resolvesOnlyTheRequestedAuthorizedProperty() {
        AuthorizedPropertyScope scope = resolver.resolveProperty(receptionAuthorization(), firstPropertyId);

        assertEquals(AuthorizedPropertyScope.Type.PROPERTY, scope.type());
        assertEquals(Set.of(firstPropertyId), scope.propertyIds());
    }

    @Test
    void rejectsAPropertyOutsideTheActiveMembership() {
        assertThrows(AccessDeniedException.class,
                () -> resolver.resolveProperty(receptionAuthorization(), UUID.randomUUID()));
    }

    @Test
    void rejectsAllPropertiesWithoutThePortfolioPermission() {
        assertThrows(AccessDeniedException.class,
                () -> resolver.resolveAllProperties(receptionAuthorization()));
    }

    @Test
    void resolvesAllPropertiesOnlyFromTheAuthorizedSet() {
        StaffAuthorizationSnapshot authorization = new StaffAuthorizationSnapshot(organizationId, "GERENCIA",
                Set.of("MULTI_PROPERTY_READ"), List.of(property(firstPropertyId), property(secondPropertyId)));

        AuthorizedPropertyScope scope = resolver.resolveAllProperties(authorization);

        assertEquals(AuthorizedPropertyScope.Type.ALL_PROPERTIES, scope.type());
        assertEquals(Set.of(firstPropertyId, secondPropertyId), scope.propertyIds());
    }

    private StaffAuthorizationSnapshot receptionAuthorization() {
        return new StaffAuthorizationSnapshot(organizationId, "RECEPCION", Set.of("RESERVATION_MANAGE"),
                List.of(property(firstPropertyId)));
    }

    private StaffAuthorizationSnapshot.PropertyAccess property(UUID id) {
        return new StaffAuthorizationSnapshot.PropertyAccess(id, "HB-GT-001", "Hotel Boutique",
                "America/Guatemala", "GTQ");
    }
}
