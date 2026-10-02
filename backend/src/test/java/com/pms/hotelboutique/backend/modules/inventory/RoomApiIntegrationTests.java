package com.pms.hotelboutique.backend.modules.inventory;

import com.pms.hotelboutique.backend.modules.inventory.application.*;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import java.time.*;
import java.util.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
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
class RoomApiIntegrationTests {
    private static final UUID ORG = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private final StaffPrincipal staff = new StaffPrincipal(UUID.randomUUID(), UUID.randomUUID(), "rooms-test", "GERENCIA");
    @Autowired MockMvc mvc;
    @Autowired StaffJwtService jwt;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired DataSource dataSource;
    @Autowired AuditService audit;
    @Autowired AvailabilityService availability;
    @MockitoBean StaffAuthService sessions;
    @MockitoBean StaffAuthorizationService authorization;
    private String bearer;
    private String base;
    private UUID type;

    @BeforeEach
    void setup() {
        when(sessions.getActivePrincipal(any(StaffPrincipal.class))).thenReturn(staff);
        grant(Set.of("COMMERCIAL_MANAGE"), List.of(PROPERTY));
        bearer = "Bearer " + jwt.issue(staff, Instant.now());
        base = "/api/v1/properties/" + PROPERTY + "/rooms";
        type = UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name,created_at,updated_at) VALUES (?,?,?,'Fixture',now(),now())", type, PROPERTY, "RT-" + type);
    }

    @Test
    void addsExactlyOnePhysicalRoomAndPreservesCapacityOnCodeEdit() throws Exception {
        var dates = new StayDateRange(LocalDate.of(2035, 1, 1), LocalDate.of(2035, 1, 3));
        assertEquals(0, availability.calculateATS(PROPERTY, type, dates));
        var response = mvc.perform(post(base).header("Authorization", bearer).contentType("application/json").content(body("ROOM-" + UUID.randomUUID())))
                .andExpect(status().isCreated()).andExpect(jsonPath("roomTypeId").value(type.toString())).andReturn().getResponse();
        UUID id = UUID.fromString(json.readTree(response.getContentAsString()).get("id").asText());
        assertEquals(base + "/" + id, response.getHeader("Location"));
        assertEquals(1, availability.calculateATS(PROPERTY, type, dates));
        var before = audit.findByEntity("ROOM", id).getFirst();
        assertEquals(staff.staffUserId(), before.actorId());
        assertEquals(PROPERTY, before.propertyId());
        var edit = mvc.perform(patch(base + "/" + id).header("Authorization", bearer).contentType("application/json").content("{\"code\":\"NEW-CODE\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var replay = mvc.perform(patch(base + "/" + id).header("Authorization", bearer).contentType("application/json").content("{\"code\":\"NEW-CODE\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertEquals(edit, replay);
        assertEquals(2, audit.findByEntity("ROOM", id).size());
        assertEquals(1, availability.calculateATS(PROPERTY, type, dates));
        mvc.perform(get(base + "/" + id).header("Authorization", bearer)).andExpect(status().isOk());
        mvc.perform(get(base).header("Authorization", bearer)).andExpect(status().isOk());
    }

    @Test
    void deniesWritesWithoutPermissionAndRejectsInvalidOrImmutableFields() throws Exception {
        for (String payload : List.of("{}", "{\"code\":null}", "{\"code\":\" \"}", "{\"code\":\"" + "x".repeat(65) + "\"}", "{\"code\":\"A\",\"roomTypeId\":\"" + type + "\"}")) {
            mvc.perform(patch(base + "/" + UUID.randomUUID()).header("Authorization", bearer).contentType("application/json").content(payload)).andExpect(status().isBadRequest());
        }
        mvc.perform(post(base).header("Authorization", bearer).contentType("application/json").content("{\"code\":\"A\"}"))
                .andExpect(status().isBadRequest());
        grant(Set.of(), List.of(PROPERTY));
        mvc.perform(get(base).header("Authorization", bearer)).andExpect(status().isOk());
        mvc.perform(post(base).header("Authorization", bearer).contentType("application/json").content(body("DENIED"))).andExpect(status().isForbidden());
        mvc.perform(get(base)).andExpect(status().isUnauthorized());
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM rooms WHERE room_type_id=?", Integer.class, type));
    }

    @Test
    void bindsTypeAndRoomToThePropertyAndNeverReadsOtherScope() throws Exception {
        UUID other = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) VALUES (?,?,?,'Other','UTC','GTQ','ACTIVE',now(),now())", other, ORG, "P-" + other);
        UUID foreignType = UUID.randomUUID();
        UUID foreignRoom = UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name,created_at,updated_at) VALUES (?,?,?,'Other',now(),now())", foreignType, other, "RT-" + foreignType);
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code,created_at,updated_at) VALUES (?,?,?,'Other',now(),now())", foreignRoom, other, foreignType);
        mvc.perform(get(base + "/" + foreignRoom).header("Authorization", bearer)).andExpect(status().isNotFound());
        mvc.perform(post(base).header("Authorization", bearer).contentType("application/json").content("{\"code\":\"A\",\"roomTypeId\":\"" + foreignType + "\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/properties/" + other + "/rooms").header("Authorization", bearer)).andExpect(status().isForbidden());
    }

    @Test
    void duplicateCodeReturnsConflict() throws Exception {
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code,created_at,updated_at) VALUES (?,?,?,'DUPLICATE',now(),now())", UUID.randomUUID(), PROPERTY, type);
        mvc.perform(post(base).header("Authorization", bearer).contentType("application/json").content(body("DUPLICATE"))).andExpect(status().isConflict());
    }

    @Test
    void creationHoldsParentRowLockUsedByAdmission() throws Exception {
        // Committed fixture: a second connection must see the row to contend on its lock.
        type = UUID.randomUUID();
        try (var connection = dataSource.getConnection();
                var insert = connection.prepareStatement("INSERT INTO room_types(id,property_id,code,name,created_at,updated_at) VALUES (?,?,?,'Lock fixture',now(),now())")) {
            insert.setObject(1, type);
            insert.setObject(2, PROPERTY);
            insert.setString(3, "LOCK-" + type);
            insert.executeUpdate();
        }
        mvc.perform(post(base).header("Authorization", bearer).contentType("application/json").content(body("LOCK-" + UUID.randomUUID()))).andExpect(status().isCreated());
        try (var connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try (var query = connection.prepareStatement("SELECT id FROM room_types WHERE id=? FOR UPDATE NOWAIT")) {
                query.setObject(1, type);
                assertEquals("55P03", assertThrows(java.sql.SQLException.class, query::executeQuery).getSQLState());
            } finally { connection.rollback(); }
        }
    }

    @Test
    void publishesTypedSwagger() throws Exception {
        var doc = json.readTree(mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        var operation = doc.get("paths").get("/api/v1/properties/{propertyId}/rooms").get("post");
        assertTrue(operation.get("security").get(0).has("bearerAuth"));
        assertEquals("#/components/schemas/RoomView", operation.get("responses").get("201").get("content").get("application/json").get("schema").get("$ref").asText());
    }

    private String body(String code) { return "{\"roomTypeId\":\"" + type + "\",\"code\":\"" + code + "\"}"; }
    private void grant(Set<String> permissions, List<UUID> ids) {
        when(authorization.resolve(staff.staffUserId())).thenReturn(new StaffAuthorizationSnapshot(ORG, "GERENCIA", permissions,
                ids.stream().map(id -> new StaffAuthorizationSnapshot.PropertyAccess(id, "FIXTURE", "Hotel", "UTC", "GTQ")).toList()));
    }
}
