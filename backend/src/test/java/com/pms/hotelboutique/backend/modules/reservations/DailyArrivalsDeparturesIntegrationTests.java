package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.DailyArrivalsDeparturesService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.LocalDate;
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
class DailyArrivalsDeparturesIntegrationTests {
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final LocalDate FIRST = LocalDate.parse("2035-03-10");
    private static final String ROUTE = "/api/v1/reports/arrivals-departures/daily";
    @Autowired JdbcTemplate jdbc;
    @Autowired DailyArrivalsDeparturesService reports;
    @Autowired MockMvc mvc;
    @Autowired StaffJwtService jwt;
    @Autowired GuestJwtService guestJwt;
    @Autowired EntityManager entityManager;
    @Autowired ObjectMapper json;
    UUID property, other, type;
    StaffPrincipal manager, reception;

    @BeforeEach void fixtures() {
        property = property("America/Guatemala", "GTQ");
        other = property("America/New_York", "USD");
        type = type(property);
        manager = staff("GERENCIA", property, other);
        reception = staff("RECEPCION", property);
    }

    @Test void countsIndependentStaysAndInclusiveDepartureDatesWithoutCartesianMultiplication() {
        UUID multi = reservation(property, "CONFIRMED");
        stay(property, type, multi, "RESERVED", FIRST, FIRST.plusDays(2));
        stay(property, type, multi, "RESERVED", FIRST, FIRST.plusDays(2));
        stay(property, type, multi, "IN_HOUSE", FIRST, FIRST.plusDays(1));
        stay(property, type, reservation(property, "PENDING"), "RESERVED", FIRST.minusDays(1), FIRST);
        for (String state : new String[]{"CANCELLED", "NO_SHOW", "CHECKED_OUT"}) {
            stay(property, type, multi, state, FIRST, FIRST.plusDays(2));
        }
        for (String state : new String[]{"RESERVED", "IN_HOUSE"}) {
            stay(property, type, reservation(property, "CANCELLED"), state, FIRST, FIRST.plusDays(2));
        }
        var rows = reports.read(reception, property, FIRST, FIRST.plusDays(2)).rows();
        assertEquals(3, rows.size());
        assertEquals(2, rows.get(0).pendingArrivals()); assertEquals(1, rows.get(0).pendingDepartures());
        assertEquals(0, rows.get(1).pendingArrivals()); assertEquals(1, rows.get(1).pendingDepartures());
        assertEquals(0, rows.get(2).pendingArrivals()); assertEquals(2, rows.get(2).pendingDepartures());
    }

    @Test void currentDatesAndStatusChangesReplacePendingCountsRatherThanReconstructHistory() {
        UUID id = stay(property, type, reservation(property, "CONFIRMED"), "RESERVED", FIRST, FIRST.plusDays(1));
        assertEquals(1, reports.read(reception, property, FIRST, FIRST).rows().getFirst().pendingArrivals());
        jdbc.update("UPDATE reservation_stays SET status='IN_HOUSE',updated_at=now() WHERE id=?", id);
        assertEquals(0, reports.read(reception, property, FIRST, FIRST).rows().getFirst().pendingArrivals());
        jdbc.update("UPDATE reservation_stays SET departure=?,updated_at=now() WHERE id=?", FIRST.plusDays(2), id);
        assertEquals(0, reports.read(reception, property, FIRST.plusDays(1), FIRST.plusDays(1)).rows().getFirst().pendingDepartures());
        assertEquals(1, reports.read(reception, property, FIRST.plusDays(2), FIRST.plusDays(2)).rows().getFirst().pendingDepartures());
        jdbc.update("UPDATE reservation_stays SET status='CHECKED_OUT',updated_at=now() WHERE id=?", id);
        assertEquals(0, reports.read(reception, property, FIRST.plusDays(2), FIRST.plusDays(2)).rows().getFirst().pendingDepartures());
    }

    @Test void allPropertiesKeepsLocalDaysAcrossDstAndExcludesOutsideMembership() {
        stay(other, type(other), reservation(other, "CONFIRMED"), "RESERVED", FIRST, FIRST.plusDays(2));
        UUID outside = property("UTC", "EUR");
        stay(outside, type(outside), reservation(outside, "CONFIRMED"), "RESERVED", FIRST, FIRST.plusDays(1));
        var rows = reports.read(manager, null, FIRST, FIRST.plusDays(2)).rows();
        assertEquals(6, rows.size());
        assertFalse(rows.stream().anyMatch(row -> row.propertyId().equals(outside)));
        var usd = rows.stream().filter(row -> row.propertyId().equals(other)).toList();
        assertEquals("America/New_York", usd.getFirst().timezone()); assertEquals("USD", usd.getFirst().currency());
        assertEquals(1, usd.getFirst().pendingArrivals()); assertEquals(1, usd.getLast().pendingDepartures());
        assertEquals(FIRST.plusDays(1), usd.get(1).date());
        var sorted = rows.stream().sorted(java.util.Comparator.comparing((com.pms.hotelboutique.backend.modules.reservations.application.DailyArrivalsDeparturesReport.Day row) -> row.propertyId().toString()).thenComparing(row -> row.date())).toList();
        assertEquals(sorted, rows);
    }

    @Test void emptyPropertyReturnsRealZeroRowsIncluding366DayBoundary() {
        var rows = reports.read(reception, property, FIRST, FIRST.plusDays(365)).rows();
        assertEquals(366, rows.size());
        assertTrue(rows.stream().allMatch(row -> row.pendingArrivals() == 0 && row.pendingDepartures() == 0));
        assertThrows(IllegalArgumentException.class, () -> reports.read(reception, property, FIRST, FIRST.plusDays(366)));
        assertThrows(IllegalArgumentException.class, () -> reports.read(reception, property, FIRST, FIRST.minusDays(1)));
    }

    @Test void httpRequiresStaffAndRevalidatesPermissionAndPropertyScope() throws Exception {
        var request = get(ROUTE).param("from", FIRST.toString()).param("to", FIRST.toString()).param("propertyId", property.toString());
        mvc.perform(request).andExpect(status().isUnauthorized()).andExpect(header().string("Cache-Control", "private, no-store"));
        String guest = guestJwt.issue(new GuestPrincipal(UUID.randomUUID(), UUID.randomUUID(), "guest@example.test"), Instant.now());
        mvc.perform(get(ROUTE).param("from", FIRST.toString()).param("to", FIRST.toString()).param("propertyId", property.toString())
                .header("Authorization", "Bearer " + guest)).andExpect(status().isUnauthorized());
        mvc.perform(query(property).header("Authorization", bearer(reception))).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store")).andExpect(jsonPath("$.rows[0].pendingArrivals").value(0));
        mvc.perform(query(other).header("Authorization", bearer(reception))).andExpect(status().isForbidden());
        mvc.perform(all().header("Authorization", bearer(reception))).andExpect(status().isForbidden());
        mvc.perform(query(UUID.randomUUID()).header("Authorization", bearer(manager))).andExpect(status().isForbidden());
        var auditor = staff("AUDITOR", property);
        mvc.perform(query(property).header("Authorization", bearer(auditor))).andExpect(status().isForbidden());
        jdbc.update("DELETE FROM role_permissions WHERE role_code='GERENCIA' AND permission_code='RESERVATION_MANAGE'");
        mvc.perform(all().header("Authorization", bearer(manager))).andExpect(status().isOk());
        jdbc.update("DELETE FROM role_permissions WHERE role_code='GERENCIA' AND permission_code='MULTI_PROPERTY_READ'");
        mvc.perform(all().header("Authorization", bearer(manager))).andExpect(status().isForbidden());
        mvc.perform(query(property).header("Authorization", bearer(manager))).andExpect(status().isOk());
    }

    @Test void membershipAndSessionRevocationTakeEffectOnNextRead() throws Exception {
        jdbc.update("UPDATE membership_properties SET status='INACTIVE',updated_at=now() WHERE staff_user_id=? AND property_id=?", manager.staffUserId(), other);
        entityManager.clear();
        mvc.perform(query(other).header("Authorization", bearer(manager))).andExpect(status().isForbidden());
        mvc.perform(all().header("Authorization", bearer(manager))).andExpect(status().isOk()).andExpect(jsonPath("$.rows.length()").value(1));
        jdbc.update("UPDATE auth_sessions SET status='REVOKED',revoked_at=now() WHERE id=?", reception.sessionId());
        entityManager.clear();
        mvc.perform(query(property).header("Authorization", bearer(reception))).andExpect(status().isUnauthorized());
    }

    @Test void strictFiltersRejectInvalidRangesUnknownsDuplicatesAndAmbiguousScope() throws Exception {
        for (String[] dates : new String[][]{{"2035-02-30","2035-03-01"},{"2035-03-11","2035-03-10"},{"2035-01-01","2036-01-02"},{"+2035-01-01","2035-01-01"}}) {
            mvc.perform(get(ROUTE).param("from", dates[0]).param("to", dates[1]).param("propertyId", property.toString()).header("Authorization", bearer(reception)))
                    .andExpect(status().isBadRequest()).andExpect(header().string("Cache-Control", "private, no-store"));
        }
        for (String field : new String[]{"from", "to", "propertyId"}) {
            mvc.perform(query(property).param(field, "duplicate").header("Authorization", bearer(reception))).andExpect(status().isBadRequest());
        }
        mvc.perform(query(property).param("scope", "ALL_PROPERTIES").header("Authorization", bearer(reception))).andExpect(status().isBadRequest());
        mvc.perform(query(property).param("organizationId", ORGANIZATION.toString()).header("Authorization", bearer(reception))).andExpect(status().isBadRequest());
        mvc.perform(get(ROUTE).param("from", FIRST.toString()).param("to", FIRST.toString()).header("Authorization", bearer(reception))).andExpect(status().isBadRequest());
        mvc.perform(get(ROUTE).param("from", FIRST.toString()).param("to", FIRST.toString()).param("scope", "").header("Authorization", bearer(reception))).andExpect(status().isBadRequest());
    }

    @Test void openApiDocumentsExactShapeAudienceSecurityLimitsAndErrors() throws Exception {
        var doc = json.readTree(mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        var operation = doc.path("paths").path(ROUTE).path("get");
        assertEquals("staff", operation.path("x-audience").asText());
        assertTrue(operation.path("security").get(0).has("bearerAuth"));
        assertEquals(4, operation.path("parameters").size());
        for (String code : new String[]{"200", "400", "401", "403", "503"}) assertTrue(operation.path("responses").has(code));
        var schema = doc.path("components").path("schemas").path("DailyArrivalsDeparturesReport");
        assertEquals(2, schema.path("required").size()); assertEquals(50000, schema.path("properties").path("rows").path("maxItems").asInt());
        var day = doc.path("components").path("schemas").path("ArrivalsDeparturesDay");
        assertEquals(6, day.path("required").size()); assertEquals(6, day.path("properties").size());
        assertEquals(0, day.path("properties").path("pendingArrivals").path("minimum").asInt());
        assertEquals("int64", day.path("properties").path("pendingDepartures").path("format").asText());
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder query(UUID id) {
        return get(ROUTE).param("from", FIRST.toString()).param("to", FIRST.toString()).param("propertyId", id.toString());
    }
    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder all() {
        return get(ROUTE).param("from", FIRST.toString()).param("to", FIRST.toString()).param("scope", "ALL_PROPERTIES");
    }
    private String bearer(StaffPrincipal staff) { return "Bearer " + jwt.issue(staff, Instant.now()); }
    private UUID property(String timezone, String currency) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at) VALUES (?,?,?,?,?,?,'ACTIVE',now(),now())",
                id, ORGANIZATION, "ARRDEP QA", id.toString(), timezone, currency); return id;
    }
    private UUID type(UUID propertyId) {
        UUID id = UUID.randomUUID(); jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,?,'ARRDEP QA')", id, propertyId, id.toString()); return id;
    }
    private UUID reservation(UUID propertyId, String status) {
        UUID id = UUID.randomUUID(); jdbc.update("INSERT INTO reservations(id,property_id,confirmation_code,status,currency,source_channel,created_at,updated_at) VALUES (?,?,?,?,(SELECT currency FROM properties WHERE id=?),'DIRECT',now(),now())",
                id, propertyId, id.toString().substring(0, 16), status, propertyId); return id;
    }
    private UUID stay(UUID propertyId, UUID typeId, UUID reservation, String status, LocalDate arrival, LocalDate departure) {
        UUID id = UUID.randomUUID(); jdbc.update("INSERT INTO reservation_stays(id,reservation_id,property_id,room_type_id,arrival,departure,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,now(),now())",
                id, reservation, propertyId, typeId, arrival, departure, status); return id;
    }
    private StaffPrincipal staff(String role, UUID... ids) {
        UUID id = UUID.randomUUID(), session = UUID.randomUUID();
        jdbc.update("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) VALUES (?,?,?,'test-only-unused-hash',?,'ACTIVE',now(),now())", id, id.toString(), id + "@example.test", role);
        jdbc.update("INSERT INTO organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())", id, ORGANIZATION, role);
        for (UUID propertyId : ids) jdbc.update("INSERT INTO membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())", id, ORGANIZATION, propertyId);
        jdbc.update("INSERT INTO auth_sessions(id,context,staff_user_id,status,expires_at,created_at) VALUES (?,'STAFF',?,'ACTIVE',now()+interval '1 day',now())", session, id);
        return new StaffPrincipal(id, session, id.toString(), role);
    }
}
