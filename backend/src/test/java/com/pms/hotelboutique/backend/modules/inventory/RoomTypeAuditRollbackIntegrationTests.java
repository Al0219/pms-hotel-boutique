package com.pms.hotelboutique.backend.modules.inventory;

import com.pms.hotelboutique.backend.modules.inventory.application.RoomTypeService;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Assertions run outside the failed application transaction. */
@SpringBootTest
class RoomTypeAuditRollbackIntegrationTests {
    private static final UUID ORG = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    @Autowired RoomTypeService types;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean AuditService audit;
    @MockitoBean StaffAuthService sessions;
    @MockitoBean StaffAuthorizationService authorization;

    @BeforeEach
    void authenticate() {
        var staff = new StaffPrincipal(UUID.randomUUID(), UUID.randomUUID(), "rollback", "GERENCIA");
        when(sessions.getActivePrincipal(any(StaffPrincipal.class))).thenReturn(staff);
        var property = new StaffAuthorizationSnapshot.PropertyAccess(PROPERTY, "FIXTURE", "Hotel", "UTC", "GTQ");
        when(authorization.resolve(staff.staffUserId())).thenReturn(new StaffAuthorizationSnapshot(ORG, "GERENCIA", Set.of("COMMERCIAL_MANAGE"), List.of(property)));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(staff, null, List.of()));
        when(audit.record(any())).thenThrow(new IllegalStateException("Disposable audit failure"));
    }

    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @Test
    void createRollsBackIfAuditFails() {
        String code = "RB-" + UUID.randomUUID();
        assertThrows(IllegalStateException.class, () -> types.create(PROPERTY, code, "Rollback"));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM room_types WHERE property_id=? AND code=?", Integer.class, PROPERTY, code));
    }

    @Test
    void editRollsBackIfAuditFails() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name,created_at,updated_at) VALUES (?,?,?,'Before',now(),now())", id, PROPERTY, "RB-" + id);
        var before = jdbc.queryForMap("SELECT code,name,updated_at FROM room_types WHERE id=?", id);
        assertThrows(IllegalStateException.class, () -> types.update(PROPERTY, id, null, "Rollback"));
        assertEquals(before, jdbc.queryForMap("SELECT code,name,updated_at FROM room_types WHERE id=?", id));
    }
}
