package com.pms.hotelboutique.backend.modules.inventory;

import com.pms.hotelboutique.backend.modules.inventory.application.DailyOnBooksReport;
import com.pms.hotelboutique.backend.modules.inventory.application.DailyOnBooksService;
import com.pms.hotelboutique.backend.modules.inventory.application.AvailabilityPort;
import com.pms.hotelboutique.backend.modules.inventory.application.StayDateRange;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest(properties = "pms.security.jwt-secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
@AutoConfigureMockMvc
@Transactional
class DailyOnBooksServiceIntegrationTests {
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final LocalDate FIRST = LocalDate.parse("2035-01-01");

    @Autowired JdbcTemplate jdbc;
    @Autowired DailyOnBooksService reports;
    @Autowired AvailabilityPort availability;
    @Autowired MockMvc mvc;
    @Autowired StaffJwtService jwt;
    @Autowired GuestJwtService guestJwt;
    @Autowired EntityManager entityManager;

    private UUID property;
    private UUID otherProperty;
    private StaffPrincipal manager;

    @BeforeEach
    void fixtures() {
        property = insertProperty("America/Guatemala", "GTQ");
        otherProperty = insertProperty("America/New_York", "USD");
        manager = staff("GERENCIA", property, otherProperty);
    }

    @Test
    void countsStayNightsRatherThanReservationsAndDeduplicatesOoo() {
        UUID type = insertRoomType(property);
        UUID firstRoom = insertRoom(property, type);
        UUID secondRoom = insertRoom(property, type);
        insertRoom(property, type);
        insertOutage(property, firstRoom, "OOO");
        insertOutage(property, firstRoom, "OOO");
        insertOutage(property, secondRoom, "OOS");

        UUID multiRoomReservation = insertReservation(property, "CONFIRMED", "GTQ");
        insertStay(property, type, multiRoomReservation, "RESERVED", FIRST, FIRST.plusDays(2));
        insertStay(property, type, multiRoomReservation, "IN_HOUSE", FIRST, FIRST.plusDays(1));
        insertStay(property, type, insertReservation(property, "CANCELLED", "GTQ"),
                "RESERVED", FIRST, FIRST.plusDays(2));
        insertStay(property, type, insertReservation(property, "CONFIRMED", "GTQ"),
                "NO_SHOW", FIRST, FIRST.plusDays(2));

        var rows = reports.forProperty(manager, property, FIRST, FIRST.plusDays(2)).nights();
        assertEquals(3, rows.size());
        assertNight(rows.get(0), 3, 1, 2, 2, "100.00");
        assertNight(rows.get(1), 3, 1, 2, 1, "50.00");
        assertNight(rows.get(2), 3, 1, 2, 0, "0.00");
        assertEquals(availability.calculateATS(property, type,
                new StayDateRange(FIRST, FIRST.plusDays(1))),
                rows.get(0).availableRooms() - rows.get(0).onBooksRooms());
    }

    @Test
    void keepsPropertiesSeparatedAndNeverIncludesUnauthorizedOnes() {
        UUID ownType = insertRoomType(property);
        insertRoom(property, ownType);
        UUID otherType = insertRoomType(otherProperty);
        insertRoom(otherProperty, otherType);
        insertStay(otherProperty, otherType, insertReservation(otherProperty, "CONFIRMED", "USD"),
                "RESERVED", FIRST, FIRST.plusDays(1));
        UUID outside = insertProperty("UTC", "EUR");
        UUID outsideType = insertRoomType(outside);
        insertRoom(outside, outsideType);

        var rows = reports.forAllAuthorizedProperties(manager, FIRST, FIRST).nights();
        assertEquals(2, rows.size());
        assertEquals(1, rows.stream().filter(row -> row.propertyId().equals(otherProperty)
                && row.currency().equals("USD") && row.onBooksRooms() == 1).count());
        assertEquals(1, rows.stream().filter(row -> row.propertyId().equals(property)
                && row.currency().equals("GTQ") && row.onBooksRooms() == 0).count());
        assertThrows(AccessDeniedException.class,
                () -> reports.forProperty(manager, outside, FIRST, FIRST));
    }

    @Test
    void returnsNullPercentWithReasonWhenNoRoomsAreAvailable() {
        var row = reports.forProperty(manager, property, FIRST, FIRST).nights().get(0);
        assertNight(row, 0, 0, 0, 0, null);
        assertNull(row.onBooksPercent());
        assertEquals("NO_AVAILABLE_ROOMS", row.unavailableReason());
    }

    @Test
    void deniesMissingRevokedAndUnprivilegedStaffBeforeReading() {
        assertThrows(StaffAuthenticationException.class,
                () -> reports.forProperty(null, property, FIRST, FIRST));
        var reception = staff("RECEPCION", property);
        assertThrows(AccessDeniedException.class,
                () -> reports.forProperty(reception, property, FIRST, FIRST));
        var auditor = staff("AUDITOR", property);
        assertThrows(AccessDeniedException.class,
                () -> reports.forAllAuthorizedProperties(auditor, FIRST, FIRST));
        jdbc.update("UPDATE auth_sessions SET status='REVOKED',revoked_at=now() WHERE id=?",
                manager.sessionId());
        assertThrows(StaffAuthenticationException.class,
                () -> reports.forProperty(manager, property, FIRST, FIRST));
    }

    @Test
    void rejectsInvalidOrOversizedRanges() {
        assertThrows(IllegalArgumentException.class,
                () -> reports.forProperty(manager, property, FIRST, FIRST.minusDays(1)));
        assertThrows(IllegalArgumentException.class,
                () -> reports.forProperty(manager, property, FIRST, FIRST.plusDays(366)));
        assertEquals(366, reports.forProperty(manager, property, FIRST, FIRST.plusDays(365)).nights().size());
    }

    @Test
    void httpReturnsCurrentRowsInOrderWithoutCachingAndAllowsOverbooking() throws Exception {
        UUID type = insertRoomType(property);
        insertRoom(property, type);
        insertStay(property, type, insertReservation(property, "CONFIRMED", "GTQ"),
                "RESERVED", FIRST, FIRST.plusDays(1));
        insertStay(property, type, insertReservation(property, "CONFIRMED", "GTQ"),
                "RESERVED", FIRST, FIRST.plusDays(1));
        var response = mvc.perform(get("/api/v1/reports/on-books/daily")
                .param("from", FIRST.toString()).param("to", FIRST.toString())
                .param("scope", "ALL_PROPERTIES").header("Authorization", bearer(manager)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store"))
                .andExpect(jsonPath("$.calculatedAt").exists())
                .andExpect(jsonPath("$.rows.length()").value(2))
                .andReturn();
        var body = new tools.jackson.databind.ObjectMapper().readTree(response.getResponse().getContentAsString());
        var first = body.get("rows").get(0);
        var second = body.get("rows").get(1);
        assertEquals(true, first.get("propertyId").asText().compareTo(second.get("propertyId").asText()) < 0);
        var own = first.get("propertyId").asText().equals(property.toString()) ? first : second;
        assertEquals(1, own.get("physicalRooms").asInt());
        assertEquals(2, own.get("onBooksRooms").asInt());
        assertEquals("200.00", own.get("onBooksPercent").decimalValue().setScale(2).toPlainString());
        var empty = first.get("propertyId").asText().equals(otherProperty.toString()) ? first : second;
        assertEquals(0, empty.get("physicalRooms").asInt());
        assertEquals(true, empty.get("onBooksPercent").isNull());
        assertEquals("NO_AVAILABLE_ROOMS", empty.get("unavailableReason").asText());
    }

    @Test
    void httpRejectsInvalidFiltersWith400() throws Exception {
        String token = bearer(manager);
        String route = "/api/v1/reports/on-books/daily";
        mvc.perform(get(route).param("from", "2035-01-01").param("to", "2035-01-01")
                .header("Authorization", token)).andExpect(status().isBadRequest());
        mvc.perform(get(route).param("from", "2035-01-01").param("to", "2035-01-01")
                .param("propertyId", property.toString()).param("scope", "ALL_PROPERTIES")
                .header("Authorization", token)).andExpect(status().isBadRequest());
        for (String scope : new String[]{"GLOBAL", ""}) {
            mvc.perform(get(route).param("from", "2035-01-01").param("to", "2035-01-01")
                    .param("scope", scope).header("Authorization", token)).andExpect(status().isBadRequest());
        }
        for (String propertyValue : new String[]{"bad-uuid", property + "," + otherProperty}) {
            mvc.perform(get(route).param("from", "2035-01-01").param("to", "2035-01-01")
                    .param("propertyId", propertyValue).header("Authorization", token)).andExpect(status().isBadRequest());
        }
        for (String[] dates : new String[][]{{"bad", "2035-01-01"}, {"2035-01-02", "2035-01-01"},
                {"2035-01-01", "2036-01-02"}}) {
            mvc.perform(get(route).param("from", dates[0]).param("to", dates[1])
                    .param("propertyId", property.toString()).header("Authorization", token))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(get(route).param("from", "2035-01-01").param("to", "2035-01-01")
                .param("scope", "ALL_PROPERTIES").param("organizationId", ORGANIZATION.toString())
                .header("Authorization", token)).andExpect(status().isBadRequest());
        mvc.perform(get(route).param("from", "2035-01-01").param("to", "2035-01-01")
                .param("propertyId", property.toString(), otherProperty.toString())
                .header("Authorization", token)).andExpect(status().isBadRequest());
    }

    @Test
    void httpPreservesStaffSeparationAndPropertyPermissions() throws Exception {
        String route = "/api/v1/reports/on-books/daily";
        mvc.perform(get(route).param("from", "2035-01-01").param("to", "2035-01-01")
                .param("propertyId", property.toString())).andExpect(status().isUnauthorized());
        mvc.perform(get(route).param("from", "2035-01-01").param("to", "2035-01-01")
                .param("propertyId", property.toString()).header("Authorization", "Bearer invalid"))
                .andExpect(status().isUnauthorized());
        String guest = guestJwt.issue(new GuestPrincipal(UUID.randomUUID(), UUID.randomUUID(),
                "guest@example.test"), Instant.now());
        mvc.perform(get(route).param("from", "2035-01-01").param("to", "2035-01-01")
                .param("propertyId", property.toString()).header("Authorization", "Bearer " + guest))
                .andExpect(status().isUnauthorized());
        var reception = staff("RECEPCION", property);
        mvc.perform(get(route).param("from", "2035-01-01").param("to", "2035-01-01")
                .param("propertyId", property.toString()).header("Authorization", bearer(reception)))
                .andExpect(status().isForbidden());
        mvc.perform(get(route).param("from", "2035-01-01").param("to", "2035-01-01")
                .param("propertyId", UUID.randomUUID().toString()).header("Authorization", bearer(manager)))
                .andExpect(status().isForbidden());
        jdbc.update("UPDATE auth_sessions SET status='REVOKED',revoked_at=now() WHERE id=?", manager.sessionId());
        entityManager.clear();
        mvc.perform(get(route).param("from", "2035-01-01").param("to", "2035-01-01")
                .param("propertyId", property.toString()).header("Authorization", bearer(manager)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void allPropertiesRequiresExplicitPortfolioPermissionAndRejectsExcessiveRows() throws Exception {
        String route = "/api/v1/reports/on-books/daily";
        jdbc.update("DELETE FROM role_permissions WHERE role_code='GERENCIA' AND permission_code='MULTI_PROPERTY_READ'");
        mvc.perform(get(route).param("from", "2035-01-01").param("to", "2035-01-01")
                .param("propertyId", property.toString()).header("Authorization", bearer(manager)))
                .andExpect(status().isOk());
        mvc.perform(get(route).param("from", "2035-01-01").param("to", "2035-01-01")
                .param("scope", "ALL_PROPERTIES").header("Authorization", bearer(manager)))
                .andExpect(status().isForbidden());
        jdbc.update("INSERT INTO role_permissions(role_code,permission_code) VALUES ('GERENCIA','MULTI_PROPERTY_READ')");
        for (int index = 0; index < 135; index++) {
            UUID id = insertProperty("America/Guatemala", "GTQ");
            jdbc.update("INSERT INTO membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) "
                    + "VALUES (?,?,?,'ACTIVE',now(),now())", manager.staffUserId(), ORGANIZATION, id);
        }
        mvc.perform(get(route).param("from", "2035-01-01").param("to", "2036-01-01")
                .param("scope", "ALL_PROPERTIES").header("Authorization", bearer(manager)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void openApiPublishesTheFourReportFiltersForSwaggerTryItOut() throws Exception {
        var response = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn();
        var operation = new tools.jackson.databind.ObjectMapper()
                .readTree(response.getResponse().getContentAsString())
                .get("paths").get("/api/v1/reports/on-books/daily").get("get");
        var parameters = operation.get("parameters");
        assertEquals(4, parameters.size());
        assertEquals(true, parameters.toString().contains("\"name\":\"from\""));
        assertEquals(true, parameters.toString().contains("\"name\":\"to\""));
        assertEquals(true, parameters.toString().contains("\"name\":\"propertyId\""));
        assertEquals(true, parameters.toString().contains("\"name\":\"scope\""));
    }

    private String bearer(StaffPrincipal principal) {
        return "Bearer " + jwt.issue(principal, Instant.now());
    }

    private void assertNight(DailyOnBooksReport.Night row, long physical, long ooo,
            long available, long booked, String percent) {
        assertEquals(physical, row.physicalRooms());
        assertEquals(ooo, row.outOfOrderRooms());
        assertEquals(available, row.availableRooms());
        assertEquals(booked, row.onBooksRooms());
        if (percent != null) assertEquals(new BigDecimal(percent), row.onBooksPercent());
    }

    private UUID insertProperty(String timezone, String currency) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at) "
                + "VALUES (?,?,?, ?, ?, ?,'ACTIVE',now(),now())",
                id, ORGANIZATION, "Report " + id, id.toString(), timezone, currency);
        return id;
    }

    private UUID insertRoomType(UUID propertyId) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,?,?)",
                id, propertyId, id.toString(), "Report type");
        return id;
    }

    private UUID insertRoom(UUID propertyId, UUID typeId) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,?)",
                id, propertyId, typeId, id.toString());
        return id;
    }

    private void insertOutage(UUID propertyId, UUID roomId, String kind) {
        jdbc.update("INSERT INTO out_of_order_records(id,property_id,room_id,kind,start_date,end_date,reason,created_by,created_at) "
                + "VALUES (?,?,?,?,?,?, 'Report test', ?, now())",
                UUID.randomUUID(), propertyId, roomId, kind, FIRST, FIRST.plusDays(3), manager.staffUserId());
    }

    private UUID insertReservation(UUID propertyId, String status, String currency) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO reservations(id,property_id,confirmation_code,status,currency,source_channel,created_at,updated_at) "
                + "VALUES (?,?,?,?,?,'DIRECT',now(),now())",
                id, propertyId, id.toString().substring(0, 16), status, currency);
        return id;
    }

    private void insertStay(UUID propertyId, UUID typeId, UUID reservationId,
            String status, LocalDate arrival, LocalDate departure) {
        jdbc.update("INSERT INTO reservation_stays(id,reservation_id,property_id,room_type_id,arrival,departure,status,created_at,updated_at) "
                + "VALUES (?,?,?,?,?,?,?,now(),now())",
                UUID.randomUUID(), reservationId, propertyId, typeId, arrival, departure, status);
    }

    private StaffPrincipal staff(String role, UUID... propertyIds) {
        UUID id = UUID.randomUUID();
        UUID session = UUID.randomUUID();
        jdbc.update("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) "
                + "VALUES (?,?,?,'test-only-unused-hash',?,'ACTIVE',now(),now())",
                id, id.toString(), id + "@example.test", role);
        jdbc.update("INSERT INTO organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at) "
                + "VALUES (?,?,?,'ACTIVE',now(),now())", id, ORGANIZATION, role);
        for (UUID propertyId : propertyIds) {
            jdbc.update("INSERT INTO membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) "
                    + "VALUES (?,?,?,'ACTIVE',now(),now())", id, ORGANIZATION, propertyId);
        }
        jdbc.update("INSERT INTO auth_sessions(id,context,staff_user_id,status,expires_at,created_at) "
                + "VALUES (?,'STAFF',?,'ACTIVE',now()+interval '1 day',now())", session, id);
        return new StaffPrincipal(id, session, id.toString(), role);
    }
}
