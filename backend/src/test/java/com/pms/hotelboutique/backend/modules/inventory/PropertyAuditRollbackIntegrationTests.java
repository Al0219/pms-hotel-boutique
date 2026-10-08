package com.pms.hotelboutique.backend.modules.inventory;

import com.pms.hotelboutique.backend.modules.inventory.application.PropertyService;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** No test transaction: assertions read after the application transaction rolled back. */
@SpringBootTest
class PropertyAuditRollbackIntegrationTests {
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    @Autowired PropertyService properties;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean AuditService audit;
    @MockitoBean StaffAuthService sessions;
    @MockitoBean StaffAuthorizationService authorization;

    @BeforeEach
    void authenticateAndFailAudit() {
        var staff = new StaffPrincipal(UUID.randomUUID(), UUID.randomUUID(), "audit-test", "SUPER_ADMIN");
        when(sessions.getActivePrincipal(any(StaffPrincipal.class))).thenReturn(staff);
        var property = new StaffAuthorizationSnapshot.PropertyAccess(PROPERTY, "HB-GT-001", "Hotel", "America/Guatemala", "GTQ");
        when(authorization.resolve(staff.staffUserId())).thenReturn(new StaffAuthorizationSnapshot(ORGANIZATION,
                "SUPER_ADMIN", Set.of("STAFF_MANAGE", "COMMERCIAL_MANAGE"), List.of(property)));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(staff, null, List.of()));
        when(audit.record(any())).thenThrow(new IllegalStateException("Disposable audit failure"));
    }

    @AfterEach
    void clearAuthentication() { SecurityContextHolder.clearContext(); }

    @Test
    void creationRollsBackIfAuditFails() {
        String code = "ROLLBACK-" + UUID.randomUUID();
        assertThrows(IllegalStateException.class, () -> properties.create(code, "Rollback", "America/Guatemala", "GTQ"));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM properties WHERE organization_id=? AND code=?",
                Integer.class, ORGANIZATION, code));
        verify(audit).record(any());
    }

    @Test
    void editAndTimestampRollBackIfAuditFails() {
        var before = jdbc.queryForMap("SELECT code,name,updated_at FROM properties WHERE id=?", PROPERTY);
        assertThrows(IllegalStateException.class, () -> properties.update(PROPERTY, null, "Must roll back"));
        assertEquals(before, jdbc.queryForMap("SELECT code,name,updated_at FROM properties WHERE id=?", PROPERTY));
        verify(audit).record(any());
    }
}
