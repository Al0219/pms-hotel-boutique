package com.pms.hotelboutique.backend.modules.inventory;

import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.inventory.application.AvailabilityService;
import com.pms.hotelboutique.backend.modules.inventory.application.StayDateRange;
import java.time.LocalDate;
import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
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
class RoomTypeApiIntegrationTests {
    private static final UUID ORG = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private final StaffPrincipal staff = new StaffPrincipal(UUID.randomUUID(), UUID.randomUUID(), "catalog-test", "GERENCIA");
    @Autowired MockMvc mvc;
    @Autowired StaffJwtService jwt;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired AuditService audit;
    @Autowired AvailabilityService availability;
    @MockitoBean StaffAuthService sessions;
    @MockitoBean StaffAuthorizationService authorization;
    private String bearer;
    private String base;

    @BeforeEach
    void authenticate() {
        when(sessions.getActivePrincipal(any(StaffPrincipal.class))).thenReturn(staff);
        grant(Set.of("COMMERCIAL_MANAGE"), List.of(PROPERTY));
        bearer = "Bearer " + jwt.issue(staff, Instant.now());
        base = "/api/v1/properties/" + PROPERTY + "/room-types";
    }

    @Test
    void createsAndEditsWithoutInventingCapacityAndAuditsOnlyChanges() throws Exception {
        String code = "RT-" + UUID.randomUUID();
        var response = mvc.perform(post(base).header("Authorization", bearer).contentType("application/json")
                .content("{\"code\":\"" + code + "\",\"name\":\"Suite\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse();
        UUID id = UUID.fromString(json.readTree(response.getContentAsString()).get("id").asText());
        assertEquals(base + "/" + id, response.getHeader("Location"));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM rooms WHERE room_type_id=?", Integer.class, id));
        assertEquals(0, availability.calculateATS(PROPERTY, id, new StayDateRange(LocalDate.of(2035, 1, 1), LocalDate.of(2035, 1, 3))));
        var first = audit.findByEntity("ROOM_TYPE", id).getFirst();
        assertEquals(staff.staffUserId(), first.actorId());
        assertEquals(PROPERTY, first.propertyId());
        assertNull(first.beforeState());
        assertNotNull(first.correlationId());
        var edited = mvc.perform(patch(base + "/" + id).header("Authorization", bearer).contentType("application/json")
                .content("{\"name\":\"Suite Norte\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("code").value(code)).andReturn().getResponse().getContentAsString();
        var replay = mvc.perform(patch(base + "/" + id).header("Authorization", bearer).contentType("application/json")
                .content("{\"name\":\"Suite Norte\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertEquals(edited, replay);
        assertEquals(2, audit.findByEntity("ROOM_TYPE", id).size());
        var change = audit.findByEntity("ROOM_TYPE", id).stream().filter(e -> e.action().equals("ROOM_TYPE_UPDATED")).findFirst().orElseThrow();
        assertEquals("Suite", json.readTree(change.beforeState()).get("name").asText());
        assertEquals("Suite Norte", json.readTree(change.afterState()).get("name").asText());
        mvc.perform(get(base + "/" + id).header("Authorization", bearer)).andExpect(status().isOk()).andExpect(jsonPath("id").value(id.toString()));
    }

    @Test
    void rejectsUnknownNullAndImmutableFieldsAndRequiresPermission() throws Exception {
        UUID id = insertType(PROPERTY);
        for (String body : List.of("{}", "{\"name\":null}", "{\"code\":\" \"}", "{\"propertyId\":\"" + PROPERTY + "\"}",
                "{\"name\":\"" + "x".repeat(161) + "\"}")) {
            mvc.perform(patch(base + "/" + id).header("Authorization", bearer).contentType("application/json").content(body))
                    .andExpect(status().isBadRequest());
        }
        grant(Set.of(), List.of(PROPERTY));
        mvc.perform(get(base).header("Authorization", bearer)).andExpect(status().isOk());
        mvc.perform(patch(base + "/" + id).header("Authorization", bearer).contentType("application/json").content("{\"name\":\"Denied\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post(base).header("Authorization", bearer).contentType("application/json").content("{\"code\":\"D\",\"name\":\"Denied\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(get(base)).andExpect(status().isUnauthorized());
        assertTrue(audit.findByEntity("ROOM_TYPE", id).isEmpty());
    }

    @Test
    void bindsIdentifiersToAuthorizedPropertyAndRechecksLivePermissions() throws Exception {
        UUID other = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) VALUES (?, ?, ?, 'Other','UTC','USD','ACTIVE',now(),now())", other, ORG, "P-" + other);
        UUID foreignType = insertType(other);
        mvc.perform(get(base + "/" + foreignType).header("Authorization", bearer)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/properties/" + other + "/room-types").header("Authorization", bearer)).andExpect(status().isForbidden());
        var allowed = snapshot(Set.of("COMMERCIAL_MANAGE"), List.of(PROPERTY));
        when(authorization.resolve(staff.staffUserId())).thenReturn(allowed, snapshot(Set.of(), List.of(PROPERTY)));
        mvc.perform(post(base).header("Authorization", bearer).contentType("application/json").content("{\"code\":\"R\",\"name\":\"Revoked\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectsDuplicateCodeWithinProperty() throws Exception {
        UUID id = insertType(PROPERTY);
        String code = jdbc.queryForObject("SELECT code FROM room_types WHERE id=?", String.class, id);
        mvc.perform(post(base).header("Authorization", bearer).contentType("application/json")
                .content("{\"code\":\"" + code + "\",\"name\":\"Duplicate\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void renamePreservesPhysicalRoomsAndRatePlanReferences() throws Exception {
        UUID id = insertType(PROPERTY);
        UUID room = UUID.randomUUID();
        UUID plan = UUID.randomUUID();
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code,created_at,updated_at) VALUES (?,?,?,? ,now(),now())", room, PROPERTY, id, "R-" + room);
        jdbc.update("INSERT INTO rate_plans(id,property_id,room_type_id,code,name,base_amount_minor,currency,created_at,updated_at) VALUES (?,?,?,?,'Fixture',12500,'GTQ',now(),now())", plan, PROPERTY, id, "RP-" + plan);
        var dates = new StayDateRange(LocalDate.of(2035, 1, 1), LocalDate.of(2035, 1, 3));
        assertEquals(1, availability.calculateATS(PROPERTY, id, dates));
        mvc.perform(patch(base + "/" + id).header("Authorization", bearer).contentType("application/json").content("{\"name\":\"Renamed\"}"))
                .andExpect(status().isOk());
        assertEquals(id, jdbc.queryForObject("SELECT room_type_id FROM rooms WHERE id=?", UUID.class, room));
        assertEquals(id, jdbc.queryForObject("SELECT room_type_id FROM rate_plans WHERE id=?", UUID.class, plan));
        assertEquals(1, availability.calculateATS(PROPERTY, id, dates));
    }

    @Test
    void publishesTypedOpenApiAndBearerSecurity() throws Exception {
        var document = json.readTree(mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        var patch = document.get("paths").get("/api/v1/properties/{propertyId}/room-types/{roomTypeId}").get("patch");
        assertTrue(patch.get("security").get(0).has("bearerAuth"));
        assertEquals("#/components/schemas/RoomTypeView", patch.get("responses").get("200").get("content").get("application/json").get("schema").get("$ref").asText());
        assertTrue(patch.get("responses").has("409"));
    }

    private UUID insertType(UUID property) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name,created_at,updated_at) VALUES (?,?,?,'Fixture',now(),now())", id, property, "RT-" + id);
        return id;
    }

    private StaffAuthorizationSnapshot snapshot(Set<String> permissions, List<UUID> ids) {
        return new StaffAuthorizationSnapshot(ORG, "GERENCIA", permissions, ids.stream().map(id ->
                new StaffAuthorizationSnapshot.PropertyAccess(id, "FIXTURE", "Hotel", "America/Guatemala", "GTQ")).toList());
    }

    private void grant(Set<String> permissions, List<UUID> ids) {
        when(authorization.resolve(staff.staffUserId())).thenReturn(snapshot(permissions, ids));
    }
}
