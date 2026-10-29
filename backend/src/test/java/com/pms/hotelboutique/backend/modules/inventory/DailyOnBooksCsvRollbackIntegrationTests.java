package com.pms.hotelboutique.backend.modules.inventory;

import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** No surrounding test transaction: verifies rollback of the first actual PostgreSQL insert. */
@SpringBootTest(properties = "pms.security.jwt-secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
@AutoConfigureMockMvc
class DailyOnBooksCsvRollbackIntegrationTests {
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired StaffJwtService jwt;
    @MockitoBean AuditService audit;
    @MockitoBean StaffAuthService sessions;
    @MockitoBean StaffAuthorizationService authorization;

    @Test void secondAuditFailureRollsBackFirstInsertAndReturnsNoAttachmentOrSensitiveDetails() throws Exception {
        UUID org = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
        var principal = new StaffPrincipal(UUID.randomUUID(), UUID.randomUUID(), "csv-rollback", "GERENCIA");
        var properties = new ArrayList<StaffAuthorizationSnapshot.PropertyAccess>();
        for (int i = 0; i < 2; i++) {
            UUID property = UUID.randomUUID();
            jdbc.update("INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at) VALUES (?,?,?,?,'UTC','GTQ','ACTIVE',now(),now())",
                    property, org, "CSV rollback fixture", property.toString());
            properties.add(new StaffAuthorizationSnapshot.PropertyAccess(property, property.toString(), "CSV fixture", "UTC", "GTQ"));
        }
        when(sessions.getActivePrincipal(any(StaffPrincipal.class))).thenReturn(principal);
        when(authorization.resolve(principal.staffUserId())).thenReturn(new StaffAuthorizationSnapshot(org, "GERENCIA",
                Set.of("COMMERCIAL_MANAGE", "MULTI_PROPERTY_READ"), properties));
        var calls = new AtomicInteger();
        doAnswer(invocation -> {
            assertTrue(TransactionSynchronizationManager.isActualTransactionActive());
            assertFalse(TransactionSynchronizationManager.isCurrentTransactionReadOnly());
            if (calls.incrementAndGet() == 2) throw new IllegalStateException("sensitive-internal-audit-failure");
            var command = invocation.getArgument(0, AuditService.RecordAuditCommand.class);
            jdbc.update("INSERT INTO reservation_audit_events(id,occurred_at,actor_type,actor_id,action,entity_type,entity_id,property_id,after_state,correlation_id,created_at) VALUES (?,now(),'STAFF',?,?,?,?,?,?,?,now())",
                    UUID.randomUUID(), command.actorId(), command.action(), command.entityType(), command.entityId(),
                    command.propertyId(), command.afterState(), command.correlationId());
            return null;
        }).when(audit).record(any());
        var response = mvc.perform(get("/api/v1/reports/on-books/daily/export").accept("text/csv")
                .param("from", "2035-01-01").param("to", "2035-01-01").param("scope", "ALL_PROPERTIES")
                .header("Authorization", "Bearer " + jwt.issue(principal, Instant.now())))
                .andExpect(status().isServiceUnavailable()).andExpect(header().doesNotExist("Content-Disposition"))
                .andExpect(header().string("Cache-Control", "private, no-store")).andReturn().getResponse();
        assertEquals(2, calls.get());
        assertFalse(response.getContentAsString().contains("sensitive-internal"));
        assertFalse(response.getContentAsString().contains("propertyId,"));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM reservation_audit_events WHERE actor_id=?", Integer.class, principal.staffUserId()));
    }
}
