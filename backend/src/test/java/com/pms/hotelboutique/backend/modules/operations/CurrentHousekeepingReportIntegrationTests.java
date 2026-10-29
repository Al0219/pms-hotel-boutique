package com.pms.hotelboutique.backend.modules.operations;

import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import com.pms.hotelboutique.backend.modules.operations.application.CurrentHousekeepingReportService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "pms.security.jwt-secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
@AutoConfigureMockMvc
@Transactional
class CurrentHousekeepingReportIntegrationTests {
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final String ROUTE = "/api/v1/reports/housekeeping/current";
    @Autowired JdbcTemplate jdbc;
    @Autowired CurrentHousekeepingReportService reports;
    @Autowired MockMvc mvc;
    @Autowired StaffJwtService jwt;
    @Autowired GuestJwtService guestJwt;
    @Autowired EntityManager entityManager;
    @Autowired ObjectMapper json;
    UUID property, other, type;
    StaffPrincipal operations, manager, reception;

    @BeforeEach void fixtures() {
        property = property("America/Guatemala");
        other = property("America/New_York");
        type = type(property);
        operations = staff("OPERACIONES", property);
        manager = staff("GERENCIA", property, other);
        reception = staff("RECEPCION", property);
    }

    @Test void countsPhysicalTrackedUntrackedAndOverlappingDndWithoutInterpretingOutages() {
        UUID dirty = room(property, type), clean = room(property, type), inspected = room(property, type), unknown = room(property, type);
        track(property, dirty, "DIRTY", true);
        track(property, clean, "CLEAN", false);
        track(property, inspected, "INSPECTED", true);
        outage(property, dirty, "OOO");
        outage(property, unknown, "OOS");
        var row = reports.read(operations, property).rows().getFirst();
        assertEquals(4, row.physicalRooms()); assertEquals(3, row.trackedRooms()); assertEquals(1, row.untrackedRooms());
        assertEquals(1, row.dirtyRooms()); assertEquals(1, row.cleanRooms()); assertEquals(1, row.inspectedRooms());
        assertEquals(2, row.dndRooms()); assertEquals("America/Guatemala", row.timezone());
        jdbc.update("UPDATE hk_room_states SET status='CLEAN',updated_at=now() WHERE property_id=? AND room_id=?", property, dirty);
        var changed = reports.read(operations, property).rows().getFirst();
        assertEquals(0, changed.dirtyRooms()); assertEquals(2, changed.cleanRooms()); assertEquals(2, changed.dndRooms());
    }

    @Test void zeroRoomPropertyAndAllScopeReturnOnlyAuthorizedProperties() {
        UUID outside = property("UTC");
        room(outside, type(outside));
        var zero = reports.read(operations, property).rows().getFirst();
        assertEquals(0, zero.physicalRooms()); assertEquals(0, zero.untrackedRooms());
        room(property, type);
        var rows = reports.read(manager, null).rows();
        assertEquals(2, rows.size()); assertFalse(rows.stream().anyMatch(row -> row.propertyId().equals(outside)));
        assertEquals(1, rows.stream().filter(row -> row.propertyId().equals(property)).findFirst().orElseThrow().untrackedRooms());
        assertEquals(0, rows.stream().filter(row -> row.propertyId().equals(other)).findFirst().orElseThrow().physicalRooms());
        assertEquals(rows.stream().map(row -> row.propertyId().toString()).sorted().toList(),
                rows.stream().map(row -> row.propertyId().toString()).toList());
    }

    @Test void httpRequiresStaffOperationsPermissionAndAuthorizedScope() throws Exception {
        mvc.perform(query(property)).andExpect(status().isUnauthorized()).andExpect(header().string("Cache-Control", "private, no-store"));
        String guest = guestJwt.issue(new GuestPrincipal(UUID.randomUUID(), UUID.randomUUID(), "guest@example.test"), Instant.now());
        mvc.perform(query(property).header("Authorization", "Bearer " + guest)).andExpect(status().isUnauthorized());
        mvc.perform(query(property).header("Authorization", bearer(operations))).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store"))
                .andExpect(jsonPath("$.rows[0].physicalRooms").value(0));
        mvc.perform(query(other).header("Authorization", bearer(operations))).andExpect(status().isForbidden());
        mvc.perform(all().header("Authorization", bearer(operations))).andExpect(status().isForbidden());
        mvc.perform(query(property).header("Authorization", bearer(reception))).andExpect(status().isForbidden());
        mvc.perform(query(UUID.randomUUID()).header("Authorization", bearer(manager))).andExpect(status().isForbidden());
        jdbc.update("DELETE FROM role_permissions WHERE role_code='GERENCIA' AND permission_code='MULTI_PROPERTY_READ'");
        mvc.perform(all().header("Authorization", bearer(manager))).andExpect(status().isForbidden());
        mvc.perform(query(property).header("Authorization", bearer(manager))).andExpect(status().isOk());
    }

    @Test void membershipAndSessionRevocationAreRechecked() throws Exception {
        jdbc.update("UPDATE membership_properties SET status='INACTIVE',updated_at=now() WHERE staff_user_id=? AND property_id=?", manager.staffUserId(), other);
        entityManager.clear();
        mvc.perform(query(other).header("Authorization", bearer(manager))).andExpect(status().isForbidden());
        mvc.perform(all().header("Authorization", bearer(manager))).andExpect(status().isOk())
                .andExpect(jsonPath("$.rows.length()").value(1));
        jdbc.update("UPDATE auth_sessions SET status='REVOKED',revoked_at=now() WHERE id=?", operations.sessionId());
        entityManager.clear();
        mvc.perform(query(property).header("Authorization", bearer(operations))).andExpect(status().isUnauthorized());
    }

    @Test void rejectsMissingRepeatedUnknownAndAmbiguousFilters() throws Exception {
        for (var request : new org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder[]{
                get(ROUTE), get(ROUTE).param("scope", ""), get(ROUTE).param("scope", "ALL_PROPERTIES", "ALL_PROPERTIES"),
                get(ROUTE).param("scope", "ALL"), query(property).param("scope", "ALL_PROPERTIES"),
                query(property).param("from", "2035-01-01"), query(property).param("propertyId", property.toString()),
                get(ROUTE).param("propertyId", "not-a-uuid")}) {
            mvc.perform(request.header("Authorization", bearer(manager))).andExpect(status().isBadRequest())
                    .andExpect(header().string("Cache-Control", "private, no-store"));
        }
    }

    @Test void openApiDocumentsAudienceAndShape() throws Exception {
        var doc = json.readTree(mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        var operation = doc.path("paths").path(ROUTE).path("get");
        assertEquals("staff", operation.path("x-audience").asText());
        assertTrue(operation.path("security").get(0).has("bearerAuth"));
        assertEquals(2, operation.path("parameters").size());
        for (String code : new String[]{"200", "400", "401", "403", "503"}) assertTrue(operation.path("responses").has(code));
        var schema = doc.path("components").path("schemas").path("CurrentHousekeepingProperty");
        assertEquals(9, schema.path("required").size());
        assertEquals(0, schema.path("properties").path("untrackedRooms").path("minimum").asInt());
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder query(UUID id) {
        return get(ROUTE).param("propertyId", id.toString());
    }
    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder all() {
        return get(ROUTE).param("scope", "ALL_PROPERTIES");
    }
    private String bearer(StaffPrincipal staff) { return "Bearer " + jwt.issue(staff, Instant.now()); }
    private UUID property(String timezone) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at) VALUES (?,?,?,?,?,'GTQ','ACTIVE',now(),now())",
                id, ORGANIZATION, "HK QA", id.toString(), timezone);
        return id;
    }
    private UUID type(UUID propertyId) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,?,'HK QA')", id, propertyId, id.toString());
        return id;
    }
    private UUID room(UUID propertyId, UUID typeId) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code,created_at,updated_at) VALUES (?,?,?,?,now(),now())",
                id, propertyId, typeId, id.toString());
        return id;
    }
    private void track(UUID propertyId, UUID roomId, String status, boolean dnd) {
        jdbc.update("INSERT INTO hk_room_states(id,property_id,room_id,status,dnd,created_at,updated_at) VALUES (?,?,?,?,?,now(),now())",
                UUID.randomUUID(), propertyId, roomId, status, dnd);
    }
    private void outage(UUID propertyId, UUID roomId, String kind) {
        jdbc.update("INSERT INTO out_of_order_records(id,property_id,room_id,kind,start_date,end_date,reason,created_by,created_at) VALUES (?,?,?,?,DATE '2035-01-01',DATE '2035-01-03','HK QA',?,now())",
                UUID.randomUUID(), propertyId, roomId, kind, operations.staffUserId());
    }
    private StaffPrincipal staff(String role, UUID... ids) {
        UUID id = UUID.randomUUID(), session = UUID.randomUUID();
        jdbc.update("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) VALUES (?,?,?,'test-only-unused-hash',?,'ACTIVE',now(),now())",
                id, id.toString(), id + "@example.test", role);
        jdbc.update("INSERT INTO organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())", id, ORGANIZATION, role);
        for (UUID propertyId : ids) jdbc.update("INSERT INTO membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())", id, ORGANIZATION, propertyId);
        jdbc.update("INSERT INTO auth_sessions(id,context,staff_user_id,status,expires_at,created_at) VALUES (?,'STAFF',?,'ACTIVE',now()+interval '1 day',now())", session, id);
        return new StaffPrincipal(id, session, id.toString(), role);
    }
}
