package com.pms.hotelboutique.backend.modules.operations;

import com.pms.hotelboutique.backend.modules.operations.application.StaffHousekeepingService;
import com.pms.hotelboutique.backend.modules.operations.domain.HkRoomState.Status;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "pms.security.jwt-secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
@AutoConfigureMockMvc
@Transactional
class StaffHousekeepingIntegrationTests {
    private static final UUID ORG = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired EntityManager entities;
    @Autowired StaffJwtService jwt;
    @Autowired GuestJwtService guestJwt;
    @Autowired StaffHousekeepingService service;
    @Autowired PlatformTransactionManager transactions;
    private UUID property, other, room, foreignRoom;
    private StaffPrincipal operator;

    @BeforeEach void setup() {
        property = property(); other = property(); room = room(property, "101"); foreignRoom = room(other, "201");
        operator = staff("OPERACIONES", property);
    }
    private String route(UUID propertyId) { return "/api/v1/properties/" + propertyId + "/housekeeping/rooms"; }
    private String roomRoute() { return route(property) + "/" + room; }
    private String token(StaffPrincipal principal) { return "Bearer " + jwt.issue(principal, Instant.now()); }
    private MockHttpServletRequestBuilder write(String suffix, Object body) {
        var builder = suffix.equals("tracking") ? post(roomRoute() + "/" + suffix) : put(roomRoute() + "/" + suffix);
        return builder.header("Authorization", token(operator)).contentType("application/json").content(json.writeValueAsString(body));
    }
    private JsonNode result(MockHttpServletRequestBuilder request) throws Exception {
        return json.readTree(mvc.perform(request).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store")).andReturn().getResponse().getContentAsString());
    }
    private JsonNode track() throws Exception { return result(write("tracking", Map.of())); }
    private Map<String, Object> statusBody(JsonNode current, String target, String reason) {
        var body = new HashMap<String, Object>(); body.put("expectedStatus", current.path("status").asText());
        body.put("expectedUpdatedAt", current.path("updatedAt").asText()); body.put("toStatus", target); body.put("reason", reason);
        return body;
    }
    private int events() { return jdbc.queryForObject("SELECT count(*) FROM reservation_audit_events WHERE property_id=? AND entity_type='HK_ROOM_STATE'", Integer.class, property); }

    @Test void readDoesNotCreateTrackingAndReturnsOnlyPhysicalRoomsInScope() throws Exception {
        var board = result(get(route(property)).header("Authorization", token(operator)));
        assertEquals(1, board.path("rooms").size());
        assertEquals(room.toString(), board.path("rooms").get(0).path("roomId").asText());
        assertFalse(board.path("rooms").get(0).path("tracked").asBoolean());
        assertTrue(board.path("rooms").get(0).path("status").isNull());
        assertTrue(board.path("rooms").get(0).path("dnd").isNull());
        assertTrue(board.path("rooms").get(0).path("updatedAt").isNull());
        assertTrue(board.path("rooms").get(0).path("cleaningReason").isNull());
        result(get(roomRoute()).header("Authorization", token(operator)));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM hk_room_states WHERE property_id=?", Integer.class, property));
        assertEquals(0, events());
    }
    @Test void tracksOnceAndPersistsLifecycleReasonActorAndAudit() throws Exception {
        var dirty = track();
        assertEquals("DIRTY", dirty.path("status").asText());
        assertEquals(dirty, track()); assertEquals(1, events());
        var clean = result(write("status", statusBody(dirty, "CLEAN", null)));
        var inspected = result(write("status", statusBody(clean, "INSPECTED", null)));
        var rejected = result(write("status", statusBody(inspected, "DIRTY", "Polvo en la mesa")));
        assertEquals("Polvo en la mesa", rejected.path("cleaningReason").asText());
        entities.flush(); entities.clear();
        var persisted = result(get(roomRoute()).header("Authorization", token(operator)));
        assertEquals("DIRTY", persisted.path("status").asText()); assertEquals(4, events());
        assertEquals("Polvo en la mesa", persisted.path("cleaningReason").asText());
        var listed = result(get(route(property)).header("Authorization", token(operator)));
        assertEquals("Polvo en la mesa", listed.path("rooms").get(0).path("cleaningReason").asText());
        assertEquals(operator.staffUserId(), jdbc.queryForObject("SELECT updated_by FROM hk_room_states WHERE property_id=? AND room_id=?", UUID.class, property, room));
        assertEquals(4, jdbc.queryForObject("SELECT count(*) FROM reservation_audit_events WHERE property_id=? AND actor_type='STAFF' AND actor_id=?", Integer.class, property, operator.staffUserId()));
        assertEquals("Polvo en la mesa", jdbc.queryForObject("SELECT reason FROM reservation_audit_events WHERE property_id=? AND action='HK_INSPECTION_REJECTED'", String.class, property));
    }
    @Test void currentReasonSurvivesDndButClearsOnCleanAndUsesLatestRework() throws Exception {
        var dirty = track();
        assertTrue(dirty.path("cleaningReason").isNull());
        var clean = result(write("status", statusBody(dirty, "CLEAN", null)));
        var rework = result(write("status", statusBody(clean, "DIRTY", "Revisar baño")));
        var on = result(write("dnd", Map.of("expectedUpdatedAt", rework.path("updatedAt").asText(), "dnd", true)));
        assertEquals("Revisar baño", on.path("cleaningReason").asText());
        clean = result(write("status", statusBody(on, "CLEAN", null)));
        assertTrue(clean.path("cleaningReason").isNull());
        var inspected = result(write("status", statusBody(clean, "INSPECTED", null)));
        assertTrue(inspected.path("cleaningReason").isNull());
        var rejected = result(write("status", statusBody(inspected, "DIRTY", "  Polvo en escritorio  ")));
        assertEquals("Polvo en escritorio", rejected.path("cleaningReason").asText());
        entities.flush(); entities.clear();
        var reception = staff("RECEPCION", property);
        var listed = result(get(route(property)).header("Authorization", token(reception)));
        assertEquals("Polvo en escritorio", listed.path("rooms").get(0).path("cleaningReason").asText());
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM reservation_audit_events WHERE property_id=? AND reason IN ('Revisar baño','Polvo en escritorio')", Integer.class, property));
        mvc.perform(get(route(other)).header("Authorization", token(reception))).andExpect(status().isForbidden());
    }
    @Test void cleanReworkKeepsMandatoryReasonAndInvalidCommandsHaveNoSideEffects() throws Exception {
        var dirty = track();
        mvc.perform(write("status", statusBody(dirty, "INSPECTED", null))).andExpect(status().isConflict());
        var clean = result(write("status", statusBody(dirty, "CLEAN", null)));
        mvc.perform(write("status", statusBody(clean, "DIRTY", "  "))).andExpect(status().isBadRequest());
        mvc.perform(write("status", statusBody(clean, "DIRTY", "x".repeat(281)))).andExpect(status().isBadRequest());
        result(write("status", statusBody(clean, "DIRTY", "Repetir limpieza")));
        assertEquals("Repetir limpieza", jdbc.queryForObject("SELECT reason FROM reservation_audit_events WHERE property_id=? AND action='HK_SOILED'", String.class, property));
        assertEquals(3, events());
    }
    @Test void dndPreservesCleaningNoOpVersionAndAuditsPreviousAndNewValue() throws Exception {
        var dirty = track();
        var on = result(write("dnd", Map.of("expectedUpdatedAt", dirty.path("updatedAt").asText(), "dnd", true)));
        assertEquals("DIRTY", on.path("status").asText()); assertTrue(on.path("dnd").asBoolean());
        assertEquals(on, result(write("dnd", Map.of("expectedUpdatedAt", on.path("updatedAt").asText(), "dnd", true))));
        assertEquals(2, events());
        assertTrue(jdbc.queryForObject("SELECT before_state::text FROM reservation_audit_events WHERE property_id=? AND action='HK_DND_CHANGED'", String.class, property).contains("false"));
        assertTrue(jdbc.queryForObject("SELECT after_state::text FROM reservation_audit_events WHERE property_id=? AND action='HK_DND_CHANGED'", String.class, property).contains("true"));
    }
    @Test void staleVersionsAndUntrackedMutationsCannotOverwriteOrDuplicateAudit() throws Exception {
        mvc.perform(write("dnd", Map.of("expectedUpdatedAt", Instant.now().toString(), "dnd", true))).andExpect(status().isConflict());
        var dirty = track(); var body = statusBody(dirty, "CLEAN", null);
        result(write("status", body));
        mvc.perform(write("status", body)).andExpect(status().isConflict());
        mvc.perform(write("dnd", Map.of("expectedUpdatedAt", dirty.path("updatedAt").asText(), "dnd", true))).andExpect(status().isConflict());
        assertEquals(2, events());
    }
    @Test void rejectsGuestAnonymousRevokedAndWrongPermissionsAndRevalidatesLiveAccess() throws Exception {
        mvc.perform(get(route(property))).andExpect(status().isUnauthorized());
        String guest = guestJwt.issue(new GuestPrincipal(UUID.randomUUID(), UUID.randomUUID(), "guest@example.test"), Instant.now());
        for (String credential : new String[]{"invalid", guest})
            mvc.perform(get(route(property)).header("Authorization", "Bearer " + credential)).andExpect(status().isUnauthorized());
        for (String role : new String[]{"AUDITOR"}) {
            var denied = staff(role, property);
            mvc.perform(get(route(property)).header("Authorization", token(denied))).andExpect(status().isForbidden());
            mvc.perform(post(roomRoute()+"/tracking").header("Authorization", token(denied)).contentType("application/json").content("{}"))
                    .andExpect(status().isForbidden());
        }
        for (String role : new String[]{"GERENCIA", "SUPER_ADMIN"})
            result(get(route(property)).header("Authorization", token(staff(role, property))));
        jdbc.update("DELETE FROM role_permissions WHERE role_code='OPERACIONES' AND permission_code='OPERATIONS_MANAGE'");
        mvc.perform(get(route(property)).header("Authorization", token(operator))).andExpect(status().isForbidden());
        jdbc.update("UPDATE auth_sessions SET status='REVOKED',revoked_at=now() WHERE id=?", operator.sessionId());
        entities.clear();
        mvc.perform(get(route(property)).header("Authorization", token(operator))).andExpect(status().isUnauthorized());
    }
    @Test void receptionCanReadCleaningButCannotTrackChangeStatusOrDnd() throws Exception {
        var reception = staff("RECEPCION", property);
        var current = track();
        mvc.perform(get(route(property)).header("Authorization", token(reception))).andExpect(status().isOk());
        mvc.perform(get(roomRoute()).header("Authorization", token(reception))).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DIRTY"));
        mvc.perform(post(roomRoute()+"/tracking").header("Authorization", token(reception)).contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(put(roomRoute()+"/status").header("Authorization", token(reception)).contentType("application/json")
                .content(json.writeValueAsString(statusBody(current, "CLEAN", null)))).andExpect(status().isForbidden());
        mvc.perform(put(roomRoute()+"/dnd").header("Authorization", token(reception)).contentType("application/json")
                .content(json.writeValueAsString(Map.of("expectedUpdatedAt", current.path("updatedAt").asText(), "dnd", true))))
                .andExpect(status().isForbidden());
        assertEquals(1, events());
        mvc.perform(get(route(other)).header("Authorization", token(reception))).andExpect(status().isForbidden());
        jdbc.update("DELETE FROM role_permissions WHERE role_code='RECEPCION' AND permission_code='RESERVATION_MANAGE'");
        mvc.perform(get(route(property)).header("Authorization", token(reception))).andExpect(status().isForbidden());
    }
    @Test void rejectsUnauthorizedPropertyAndForeignRoomBeforeWriting() throws Exception {
        mvc.perform(get(route(other)).header("Authorization", token(operator))).andExpect(status().isForbidden());
        mvc.perform(get(route(property)+"/"+foreignRoom).header("Authorization", token(operator))).andExpect(status().isNotFound());
        mvc.perform(post(route(property)+"/"+foreignRoom+"/tracking").header("Authorization", token(operator)).contentType("application/json").content("{}"))
                .andExpect(status().isNotFound());
        assertEquals(0, events());
    }
    @Test void rejectsUnknownActorQueryMalformedUuidAndInvalidBodies() throws Exception {
        mvc.perform(get(route(property)).param("scope", "ALL_PROPERTIES").header("Authorization", token(operator))).andExpect(status().isBadRequest());
        mvc.perform(get(route(property)+"/1-1-1-1-1").header("Authorization", token(operator))).andExpect(status().isBadRequest());
        mvc.perform(write("tracking", Map.of("actorId", operator.staffUserId()))).andExpect(status().isBadRequest());
        mvc.perform(put(roomRoute()+"/dnd").header("Authorization", token(operator)).contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());
        assertEquals(0, events());
    }
    @Test @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void concurrentWritersHaveExactlyOneWinner() throws Exception {
        var initial = service.track(operator, property, room);
        var ready = new CountDownLatch(2); var start = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(2);
        try {
            Callable<Boolean> change = () -> { ready.countDown(); assertTrue(start.await(10, TimeUnit.SECONDS));
                try { service.transition(operator, property, room, Status.DIRTY, initial.updatedAt(), Status.CLEAN, null); return true; }
                catch (StaffHousekeepingService.Conflict expected) { return false; } };
            var first = pool.submit(change); var second = pool.submit(change);
            assertTrue(ready.await(10, TimeUnit.SECONDS)); start.countDown();
            assertNotEquals(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS));
            assertEquals(2, events()); assertEquals(Status.CLEAN, service.detail(operator, property, room).status());
        } finally { start.countDown(); pool.shutdownNow(); }
    }
    @Test @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void stateAndAuditRollBackTogether() {
        assertThrows(IllegalStateException.class, () -> new TransactionTemplate(transactions).execute(status -> {
            service.track(operator, property, room); throw new IllegalStateException("Force rollback");
        }));
        assertEquals(0, events());
        assertFalse(service.detail(operator, property, room).tracked());
    }
    @Test void generatedOpenApiIncludesEveryHousekeepingOperationAndNullableUntrackedState() throws Exception {
        var doc = json.readTree(mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        String base = "/api/v1/properties/{propertyId}/housekeeping/rooms";
        for (var op : Map.of(base, "get", base+"/{roomId}", "get", base+"/{roomId}/tracking", "post", base+"/{roomId}/status", "put", base+"/{roomId}/dnd", "put").entrySet()) {
            var endpoint = doc.path("paths").path(op.getKey()).path(op.getValue());
            assertTrue(endpoint.path("security").get(0).has("bearerAuth"));
            for (String code : List.of("200","400","401","403")) assertTrue(endpoint.path("responses").has(code), code);
            assertTrue(endpoint.path("responses").path("200").path("headers").has("Cache-Control"));
        }
        var schema = doc.path("components").path("schemas").path("StaffHousekeepingRoom");
        assertEquals("uuid", schema.path("properties").path("roomId").path("format").asText());
        assertTrue(schema.path("properties").path("updatedAt").path("type").toString().contains("null"));
        assertEquals("date-time", schema.path("properties").path("updatedAt").path("format").asText());
        boolean allowsNullStatus = false;
        for (var value : schema.path("properties").path("status").path("enum")) if (value.isNull()) allowsNullStatus = true;
        assertTrue(allowsNullStatus, "Untracked status must validate against the enum as well as its nullable type");
    }
    private UUID property() {
        UUID id = UUID.randomUUID(); jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) VALUES (?,?,?,'HK Test','America/Guatemala','GTQ','ACTIVE',now(),now())", id, ORG, id.toString()); return id;
    }
    private UUID room(UUID propertyId, String code) {
        UUID type=UUID.randomUUID(), id=UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,?,'Deluxe')", type, propertyId, type.toString());
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,?)", id, propertyId, type, code); return id;
    }
    private StaffPrincipal staff(String role, UUID propertyId) {
        UUID id=UUID.randomUUID(), session=UUID.randomUUID();
        jdbc.update("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) VALUES (?,?,?,'test-only-unused-hash',?,'ACTIVE',now(),now())", id,id.toString(),id+"@example.test",role);
        jdbc.update("INSERT INTO organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())", id,ORG,role);
        jdbc.update("INSERT INTO membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())", id,ORG,propertyId);
        jdbc.update("INSERT INTO auth_sessions(id,context,staff_user_id,status,expires_at,created_at) VALUES (?,'STAFF',?,'ACTIVE',now()+interval '1 day',now())",session,id);
        return new StaffPrincipal(id,session,id.toString(),role);
    }
}
