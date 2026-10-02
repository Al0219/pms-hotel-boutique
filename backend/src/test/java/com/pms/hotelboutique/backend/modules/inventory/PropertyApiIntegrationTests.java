package com.pms.hotelboutique.backend.modules.inventory;

import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.PropertyRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "pms.security.jwt-secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
@AutoConfigureMockMvc
@Transactional
class PropertyApiIntegrationTests {
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private final StaffPrincipal staff = new StaffPrincipal(UUID.randomUUID(), UUID.randomUUID(), "property-test", "SUPER_ADMIN");
    @Autowired MockMvc mvc;
    @Autowired StaffJwtService jwt;
    @Autowired AuditService audit;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired DataSource dataSource;
    @Autowired PropertyRepository properties;
    @MockitoBean StaffAuthService sessions;
    @MockitoBean StaffAuthorizationService authorization;
    private String bearer;

    @BeforeEach
    void authenticate() {
        when(sessions.getActivePrincipal(any(StaffPrincipal.class))).thenReturn(staff);
        grant("SUPER_ADMIN", Set.of("STAFF_MANAGE", "MULTI_PROPERTY_READ", "COMMERCIAL_MANAGE"), List.of(PROPERTY));
        bearer = "Bearer " + jwt.issue(staff, Instant.now());
    }

    @Test
    void createsInMembershipOrganizationAndAuditsActualChangesOnly() throws Exception {
        var response = mvc.perform(post("/api/v1/properties").header("Authorization", bearer)
                .contentType("application/json").content(body("NEW-" + UUID.randomUUID())))
                .andExpect(status().isCreated()).andExpect(jsonPath("organizationId").value(ORGANIZATION.toString()))
                .andExpect(jsonPath("status").value("ACTIVE")).andReturn().getResponse();
        var created = json.readTree(response.getContentAsString());
        UUID id = UUID.fromString(created.get("id").asText());
        assertEquals("/api/v1/properties/" + id, response.getHeader("Location"));
        assertTrue(created.get("createdAt").asText().endsWith("Z"));
        var first = audit.findByEntity("PROPERTY", id).getFirst();
        assertEquals(staff.staffUserId(), first.actorId());
        assertEquals(id, first.propertyId());
        assertNotNull(first.correlationId());
        assertNull(first.beforeState());
        assertEquals("Hotel", json.readTree(first.afterState()).get("name").asText());
        grant("SUPER_ADMIN", Set.of("STAFF_MANAGE", "MULTI_PROPERTY_READ", "COMMERCIAL_MANAGE"), List.of(PROPERTY, id));
        var edited = mvc.perform(patch("/api/v1/properties/" + id).header("Authorization", bearer)
                .contentType("application/json").content("{\"name\":\"Hotel Norte\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var events = audit.findByEntity("PROPERTY", id);
        assertEquals(2, events.size());
        var change = events.stream().filter(e -> e.action().equals("PROPERTY_UPDATED")).findFirst().orElseThrow();
        assertEquals("Hotel", json.readTree(change.beforeState()).get("name").asText());
        assertEquals("Hotel Norte", json.readTree(change.afterState()).get("name").asText());
        var replay = mvc.perform(patch("/api/v1/properties/" + id).header("Authorization", bearer)
                .contentType("application/json").content("{\"name\":\"Hotel Norte\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertEquals(edited, replay);
        assertEquals(2, audit.findByEntity("PROPERTY", id).size());
        assertEquals("America/Guatemala", json.readTree(edited).get("timezone").asText());
        assertEquals("GTQ", json.readTree(edited).get("currency").asText());
    }

    @Test
    void listsOnlyAuthorizedActiveRowsAndDeniesOtherProperty() throws Exception {
        UUID hidden = insertProperty(ORGANIZATION, "ACTIVE");
        UUID inactive = insertProperty(ORGANIZATION, "INACTIVE");
        UUID otherOrg = UUID.randomUUID();
        jdbc.update("INSERT INTO organizations(id,name,code,status,created_at,updated_at) "
                + "VALUES (?,'Other',?,'ACTIVE',now(),now())", otherOrg, "ORG-" + otherOrg);
        UUID foreign = insertProperty(otherOrg, "ACTIVE");
        // Even an inconsistent snapshot cannot bypass organization/status constraints in SQL.
        grant("SUPER_ADMIN", Set.of("MULTI_PROPERTY_READ"), List.of(PROPERTY, inactive, foreign));
        mvc.perform(get("/api/v1/properties").header("Authorization", bearer))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(PROPERTY.toString()));
        mvc.perform(get("/api/v1/properties/" + hidden).header("Authorization", bearer)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/properties/" + foreign).header("Authorization", bearer)).andExpect(status().isNotFound());
        grant("SUPER_ADMIN", Set.of("COMMERCIAL_MANAGE"), List.of(PROPERTY));
        mvc.perform(patch("/api/v1/properties/" + hidden).header("Authorization", bearer)
                .contentType("application/json").content("{\"name\":\"Forbidden\"}"))
                .andExpect(status().isForbidden());
        assertEquals("Fixture", jdbc.queryForObject("SELECT name FROM properties WHERE id=?", String.class, hidden));
    }

    @Test
    void rejectsRolesAndPermissionsWhileAllowingStaffScopedRead() throws Exception {
        grant("OPERACIONES", Set.of("AUDIT_READ"), List.of(PROPERTY));
        mvc.perform(get("/api/v1/properties/" + PROPERTY).header("Authorization", bearer)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/properties").header("Authorization", bearer)).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/properties").header("Authorization", bearer)
                .contentType("application/json").content(body("DENIED"))).andExpect(status().isForbidden());
        mvc.perform(patch("/api/v1/properties/" + PROPERTY).header("Authorization", bearer)
                .contentType("application/json").content("{\"name\":\"Denied\"}"))
                .andExpect(status().isForbidden());
        grant("RECEPCION", Set.of("STAFF_MANAGE"), List.of(PROPERTY));
        mvc.perform(post("/api/v1/properties").header("Authorization", bearer)
                .contentType("application/json").content(body("DENIED"))).andExpect(status().isForbidden());
        grant("SUPER_ADMIN", Set.of(), List.of(PROPERTY));
        mvc.perform(post("/api/v1/properties").header("Authorization", bearer)
                .contentType("application/json").content(body("DENIED"))).andExpect(status().isForbidden());
    }

    @Test
    void rechecksPermissionsOnTheSnapshotUsedForTheWrite() throws Exception {
        var allowed = new StaffAuthorizationSnapshot(ORGANIZATION, "SUPER_ADMIN", Set.of("STAFF_MANAGE"), List.of());
        var revoked = new StaffAuthorizationSnapshot(ORGANIZATION, "RECEPCION", Set.of(), List.of());
        when(authorization.resolve(staff.staffUserId())).thenReturn(allowed, revoked);
        String code = "REVOKED-" + UUID.randomUUID();
        mvc.perform(post("/api/v1/properties").header("Authorization", bearer)
                .contentType("application/json").content(body(code))).andExpect(status().isForbidden());
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM properties WHERE code=?", Integer.class, code));
    }

    @Test
    void rejectsInvalidAndUnapprovedFieldsWithoutAudit() throws Exception {
        for (String payload : List.of("{}", "{\"name\":null}", "{\"code\":\" \"}",
                "{\"name\":\"" + "x".repeat(161) + "\"}", "{\"timezone\":\"UTC\"}", "{\"status\":\"INACTIVE\"}")) {
            mvc.perform(patch("/api/v1/properties/" + PROPERTY).header("Authorization", bearer)
                    .contentType("application/json").content(payload)).andExpect(status().isBadRequest());
        }
        for (String payload : List.of("{}", body("BAD").replace("America/Guatemala", "+02:00"),
                body("BAD").replace("GTQ", "ZZZ"), body("BAD").replace("\"Hotel\"", "\" \""),
                body("BAD").replace("}", ",\"organizationId\":\"" + UUID.randomUUID() + "\"}"))) {
            mvc.perform(post("/api/v1/properties").header("Authorization", bearer)
                    .contentType("application/json").content(payload)).andExpect(status().isBadRequest());
        }
        assertTrue(audit.findByEntity("PROPERTY", PROPERTY).isEmpty());
    }

    @Test
    void reportsDuplicateCodeAsConflict() throws Exception {
        var code = jdbc.queryForObject("SELECT code FROM properties WHERE id=?", String.class, PROPERTY);
        mvc.perform(post("/api/v1/properties").header("Authorization", bearer)
                .contentType("application/json").content(body(code))).andExpect(status().isConflict());
    }

    @Test
    void editsCodeAndRejectsAConflictingCode() throws Exception {
        UUID existing = insertProperty(ORGANIZATION, "ACTIVE");
        grant("SUPER_ADMIN", Set.of("COMMERCIAL_MANAGE"), List.of(PROPERTY, existing));
        String nextCode = "EDIT-" + UUID.randomUUID();
        mvc.perform(patch("/api/v1/properties/" + existing).header("Authorization", bearer)
                .contentType("application/json").content("{\"code\":\"" + nextCode + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("code").value(nextCode))
                .andExpect(jsonPath("name").value("Fixture"));
        assertEquals(1, audit.findByEntity("PROPERTY", existing).size());
        String occupied = jdbc.queryForObject("SELECT code FROM properties WHERE id=?", String.class, PROPERTY);
        mvc.perform(patch("/api/v1/properties/" + existing).header("Authorization", bearer)
                .contentType("application/json").content("{\"code\":\"" + occupied + "\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void usesPostgresRowLockForScopedEdits() throws Exception {
        var scope = new AuthorizedPropertyScope(ORGANIZATION, AuthorizedPropertyScope.Type.PROPERTY, Set.of(PROPERTY));
        assertTrue(properties.lockByIdInScope(scope, PROPERTY).isPresent());
        try (var connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try (var query = connection.prepareStatement("SELECT id FROM properties WHERE id=? FOR UPDATE NOWAIT")) {
                query.setObject(1, PROPERTY);
                var exception = assertThrows(java.sql.SQLException.class, query::executeQuery);
                assertEquals("55P03", exception.getSQLState());
            } finally { connection.rollback(); }
        }
    }

    @Test
    void publishesApprovedRoutesAndBearerSecurity() throws Exception {
        var response = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse();
        var document = json.readTree(response.getContentAsString());
        var paths = document.get("paths");
        assertTrue(paths.get("/api/v1/properties").has("post"));
        assertTrue(paths.get("/api/v1/properties").has("get"));
        var patch = paths.get("/api/v1/properties/{propertyId}").get("patch");
        assertTrue(patch.get("security").get(0).has("bearerAuth"));
        assertTrue(patch.get("responses").has("409"));
        assertEquals("#/components/schemas/PropertyView", patch.get("responses").get("200")
                .get("content").get("application/json").get("schema").get("$ref").asText());
        assertEquals("#/components/schemas/ProblemDetail", patch.get("responses").get("400")
                .get("content").get("application/problem+json").get("schema").get("$ref").asText());
        assertEquals("array", paths.get("/api/v1/properties").get("get").get("responses").get("200")
                .get("content").get("application/json").get("schema").get("type").asText());
    }

    private UUID insertProperty(UUID organization, String status) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) "
                + "VALUES (?, ?, ?, 'Fixture', 'America/Guatemala', 'GTQ', ?, now(), now())", id, organization, "P-" + id, status);
        return id;
    }

    private void grant(String role, Set<String> permissions, List<UUID> ids) {
        var accesses = ids.stream().map(id -> new StaffAuthorizationSnapshot.PropertyAccess(id,
                "FIXTURE", "Hotel", "America/Guatemala", "GTQ")).toList();
        when(authorization.resolve(staff.staffUserId())).thenReturn(new StaffAuthorizationSnapshot(ORGANIZATION, role, permissions, accesses));
    }

    private String body(String code) {
        return "{\"code\":\"" + code + "\",\"name\":\"Hotel\",\"timezone\":\"America/Guatemala\",\"currency\":\"GTQ\"}";
    }
}
