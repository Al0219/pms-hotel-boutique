package com.pms.hotelboutique.backend.modules.commercial;

import com.pms.hotelboutique.backend.modules.commercial.application.AgencyService;
import com.pms.hotelboutique.backend.modules.commercial.application.CommercialException;
import com.pms.hotelboutique.backend.modules.commercial.application.CompanyService;
import com.pms.hotelboutique.backend.modules.commercial.application.EventGroupService;
import com.pms.hotelboutique.backend.modules.commercial.application.PromotionService;
import com.pms.hotelboutique.backend.modules.commercial.application.RewardCommands;
import com.pms.hotelboutique.backend.modules.commercial.application.RewardService;
import com.pms.hotelboutique.backend.modules.commercial.application.RoomBlockService;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

@SpringBootTest
@Transactional
class CommercialPermissionIntegrationTests {
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");

    @Autowired CompanyService companies;
    @Autowired AgencyService agencies;
    @Autowired EventGroupService groups;
    @Autowired RoomBlockService blocks;
    @Autowired PromotionService promotions;
    @Autowired RewardService rewards;

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"SUPER_ADMIN", "GERENCIA", "RECEPCION", "OPERACIONES", "AUDITOR"})
    void deniesAllSixServicesWithoutCommercialPermissionEvenForSuperAdmin(String role) {
        var authorization = role == null ? null : snapshot(role, Set.of("AUDIT_READ"));
        assertDenied(authorization);
    }

    @Test
    void rejectsMissingPermissionSet() {
        assertDenied(snapshot("GERENCIA", null));
    }

    @Test
    void rejectsScopeOutsideSessionAndOrganizationAcrossAllSixServices() {
        var authorization = snapshot("GERENCIA", Set.of("COMMERCIAL_MANAGE"));
        var foreignProperty = new AuthorizedPropertyScope(ORGANIZATION,
                AuthorizedPropertyScope.Type.PROPERTY, Set.of(UUID.randomUUID()));
        var foreignOrganization = new AuthorizedPropertyScope(UUID.randomUUID(),
                AuthorizedPropertyScope.Type.PROPERTY, Set.of(PROPERTY));
        for (var scope : List.of(foreignProperty, foreignOrganization)) {
            assertThrows(AccessDeniedException.class, () -> companies.list(authorization, scope));
            assertThrows(AccessDeniedException.class, () -> agencies.list(authorization, scope));
            assertThrows(AccessDeniedException.class, () -> groups.list(authorization, scope));
            assertThrows(AccessDeniedException.class,
                    () -> blocks.listByGroup(authorization, scope, UUID.randomUUID()));
            assertThrows(AccessDeniedException.class, () -> promotions.list(authorization, scope));
            assertThrows(AccessDeniedException.class,
                    () -> rewards.balanceOf(authorization, scope, UUID.randomUUID()));
        }
    }

    @Test
    void requiresMultiPropertyPermissionAndExactSessionSet() {
        UUID second = UUID.randomUUID();
        var access = List.of(
                new StaffAuthorizationSnapshot.PropertyAccess(PROPERTY, "P1", "Hotel", "America/Guatemala", "GTQ"),
                new StaffAuthorizationSnapshot.PropertyAccess(second, "P2", "Hotel 2", "America/Guatemala", "GTQ"));
        var withoutMulti = new StaffAuthorizationSnapshot(ORGANIZATION, "GERENCIA",
                Set.of("COMMERCIAL_MANAGE"), access);
        var withMulti = new StaffAuthorizationSnapshot(ORGANIZATION, "GERENCIA",
                Set.of("COMMERCIAL_MANAGE", "MULTI_PROPERTY_READ"), access);
        var all = new AuthorizedPropertyScope(ORGANIZATION,
                AuthorizedPropertyScope.Type.ALL_PROPERTIES, Set.of(PROPERTY, second));
        var partial = new AuthorizedPropertyScope(ORGANIZATION,
                AuthorizedPropertyScope.Type.ALL_PROPERTIES, Set.of(PROPERTY));
        var invalidSingle = new AuthorizedPropertyScope(ORGANIZATION,
                AuthorizedPropertyScope.Type.PROPERTY, Set.of(PROPERTY, second));
        assertThrows(AccessDeniedException.class, () -> companies.list(withoutMulti, all));
        assertThrows(AccessDeniedException.class, () -> companies.list(withMulti, partial));
        assertThrows(AccessDeniedException.class, () -> companies.list(withMulti, invalidSingle));
        assertDoesNotThrow(() -> companies.list(withMulti, all));
        assertThrows(AccessDeniedException.class,
                () -> companies.activate(withMulti, all, UUID.randomUUID(), null));
    }

    @Test
    void unauthorizedScopeIsRejectedBeforeResourceLookup() {
        var authorization = snapshot("GERENCIA", Set.of("COMMERCIAL_MANAGE"));
        var forged = new AuthorizedPropertyScope(ORGANIZATION,
                AuthorizedPropertyScope.Type.PROPERTY, Set.of(UUID.randomUUID()));
        UUID unknown = UUID.randomUUID();
        assertThrows(AccessDeniedException.class, () -> companies.get(authorization, forged, unknown));
        assertThrows(AccessDeniedException.class, () -> groups.get(authorization, forged, unknown));
        assertThrows(AccessDeniedException.class, () -> blocks.get(authorization, forged, unknown));
        assertThrows(AccessDeniedException.class,
                () -> rewards.reverse(authorization, forged,
                        new RewardCommands.ReverseRewardCommand(unknown, unknown, "test"), null));
        assertThrows(CommercialException.class,
                () -> companies.get(authorization, new AuthorizedPropertyScope(ORGANIZATION,
                        AuthorizedPropertyScope.Type.PROPERTY, Set.of(PROPERTY)), unknown));
    }

    private void assertDenied(StaffAuthorizationSnapshot authorization) {
        var scope = new AuthorizedPropertyScope(ORGANIZATION,
                AuthorizedPropertyScope.Type.PROPERTY, Set.of(PROPERTY));
        UUID unknown = UUID.randomUUID();
        // Reads and writes must fail on permission before resolving the resource.
        assertThrows(AccessDeniedException.class, () -> companies.list(authorization, scope));
        assertThrows(AccessDeniedException.class, () -> companies.activate(authorization, scope, unknown, null));
        assertThrows(AccessDeniedException.class, () -> agencies.list(authorization, scope));
        assertThrows(AccessDeniedException.class, () -> agencies.deactivate(authorization, scope, unknown, null));
        assertThrows(AccessDeniedException.class, () -> groups.list(authorization, scope));
        assertThrows(AccessDeniedException.class, () -> groups.advance(authorization, scope, unknown, null));
        assertThrows(AccessDeniedException.class, () -> blocks.listByGroup(authorization, scope, unknown));
        assertThrows(AccessDeniedException.class, () -> blocks.release(authorization, scope, unknown, null));
        assertThrows(AccessDeniedException.class, () -> promotions.list(authorization, scope));
        assertThrows(AccessDeniedException.class, () -> promotions.activate(authorization, scope, unknown, null));
        assertThrows(AccessDeniedException.class, () -> rewards.balanceOf(authorization, scope, unknown));
        assertThrows(AccessDeniedException.class, () -> rewards.historyOf(authorization, scope, unknown));
        assertThrows(AccessDeniedException.class, () -> rewards.redeem(authorization,
                new RewardCommands.SpendRewardCommand(unknown, PROPERTY, 1, "permission test"), null));
    }

    private static StaffAuthorizationSnapshot snapshot(String role, Set<String> permissions) {
        return new StaffAuthorizationSnapshot(ORGANIZATION, role, permissions,
                List.of(new StaffAuthorizationSnapshot.PropertyAccess(
                        PROPERTY, "HB-GT-001", "Hotel", "America/Guatemala", "GTQ")));
    }
}
