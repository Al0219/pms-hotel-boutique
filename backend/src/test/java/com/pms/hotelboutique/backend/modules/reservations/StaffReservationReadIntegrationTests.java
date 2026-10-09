package com.pms.hotelboutique.backend.modules.reservations;

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
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "pms.security.jwt-secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
@AutoConfigureMockMvc
@Transactional
class StaffReservationReadIntegrationTests {
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final LocalDate FIRST = LocalDate.parse("2035-01-01");
    private static final String ROUTE = "/api/v1/reservations";
    @Autowired com.pms.hotelboutique.backend.modules.reservations.application.StaffRoomAssignmentService assignmentService;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactionManager;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired StaffJwtService jwt;
    @Autowired GuestJwtService guestJwt;
    @Autowired EntityManager entityManager;
    private UUID property, otherProperty, reservation, type;
    private StaffPrincipal reception;

    @BeforeEach
    void fixtures() {
        property = insertProperty("America/Guatemala", "GTQ");
        otherProperty = insertProperty("UTC", "USD");
        reception = staff("RECEPCION", property);
        type = insertRoomType(property);
        reservation = insertReservation(property, "CONFIRMED", "GTQ");
        insertStay(property, type, reservation, "RESERVED", FIRST, FIRST.plusDays(2));
    }

    @org.junit.jupiter.api.AfterEach
    void cleanCommittedAssignmentFixtures() {
        if (!org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()) {
            // Concurrent commands need committed fixtures; preserve append-only audit history.
            jdbc.update("DELETE FROM reservation_stays WHERE reservation_id=?", reservation);
            jdbc.update("DELETE FROM reservations WHERE id=?", reservation);
        }
    }

    @Test
    void readsRealMultiRoomReservationAndResponsibleProfileWithoutOccupancyOrMoney() throws Exception {
        UUID guest = UUID.randomUUID();
        jdbc.update("INSERT INTO guest_profiles(id,first_name,last_name,email,phone,status,created_at,updated_at) VALUES (?,'Real','Responsible','private@example.test','secret-phone','ACTIVE',now(),now())", guest);
        jdbc.update("UPDATE reservations SET booking_guest_id=? WHERE id=?", guest, reservation);
        insertStay(property, type, reservation, "IN_HOUSE", FIRST, FIRST.plusDays(3));
        var response = mvc.perform(get(ROUTE + "/" + reservation).param("propertyId", property.toString())
                .header("Authorization", bearer(reception)))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "private, no-store"))
                .andExpect(jsonPath("$.reservationId").value(reservation.toString()))
                .andExpect(jsonPath("$.responsibleGuest.profileId").value(guest.toString()))
                .andExpect(jsonPath("$.responsibleGuest.firstName").value("Real"))
                .andExpect(jsonPath("$.stays.length()").value(2))
                .andExpect(jsonPath("$.stays[0].roomType.name").value("Deluxe"))
                .andExpect(jsonPath("$.stays[0].room").isEmpty())
                .andExpect(jsonPath("$.stays[0].arrival").value(FIRST.toString())).andReturn();
        String raw = response.getResponse().getContentAsString();
        for (String absent : new String[]{"secret-phone", "private@example.test", "adults", "children", "occupants", "policy", "paidAmount", "paymentReference"}) assertFalse(raw.contains(absent));
    }

    @Test
    void readsAssignedRoomAndHistoricalHeaderWithoutInventingAStay() throws Exception {
        UUID room = insertRoom(property, type);
        jdbc.update("UPDATE reservation_stays SET room_id=? WHERE reservation_id=?", room, reservation);
        mvc.perform(get(ROUTE + "/" + reservation).param("propertyId", property.toString()).header("Authorization", bearer(reception)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.stays[0].room.code").value("203"));
        UUID header = insertReservation(property, "PENDING", "GTQ");
        mvc.perform(get(ROUTE + "/" + header).param("propertyId", property.toString()).header("Authorization", bearer(reception)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.stays").isEmpty()).andExpect(jsonPath("$.responsibleGuest").isEmpty());
    }

    @Test
    void listIncludesOnlyTheRequestedPropertyAndCanBeEmpty() throws Exception {
        insertReservation(otherProperty, "CANCELLED", "USD");
        mvc.perform(get(ROUTE).param("propertyId", property.toString()).header("Authorization", bearer(reception)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].reservationId").value(reservation.toString()));
        var emptyStaff = staff("GERENCIA", otherProperty);
        UUID empty = insertProperty("UTC", "USD");
        var emptySession = staff("GERENCIA", empty);
        mvc.perform(get(ROUTE).param("propertyId", empty.toString()).header("Authorization", bearer(emptySession)))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
        mvc.perform(get(ROUTE + "/" + reservation).param("propertyId", otherProperty.toString()).header("Authorization", bearer(emptyStaff)))
                .andExpect(status().isNotFound());
        mvc.perform(get(ROUTE + "/" + UUID.randomUUID()).param("propertyId", property.toString()).header("Authorization", bearer(reception)))
                .andExpect(status().isNotFound());
    }

    @Test
    void requiresStaffAndRejectsGuestMissingInvalidOrRevokedSession() throws Exception {
        String guest = guestJwt.issue(new GuestPrincipal(UUID.randomUUID(), UUID.randomUUID(), "guest@example.test"), Instant.now());
        for (String route : new String[]{ROUTE, ROUTE + "/" + reservation}) {
            mvc.perform(get(route).param("propertyId", property.toString())).andExpect(status().isUnauthorized());
            for (String token : new String[]{"invalid", guest}) mvc.perform(get(route).param("propertyId", property.toString()).header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
        }
        jdbc.update("UPDATE auth_sessions SET status='REVOKED',revoked_at=now() WHERE id=?", reception.sessionId());
        entityManager.clear();
        mvc.perform(get(ROUTE).param("propertyId", property.toString()).header("Authorization", bearer(reception))).andExpect(status().isUnauthorized());
    }

    @Test
    void permissionsAndMembershipAreLiveAndUnauthorizedPropertyIs403() throws Exception {
        for (String role : new String[]{"OPERACIONES", "AUDITOR"}) {
            var session = staff(role, property);
            mvc.perform(get(ROUTE).param("propertyId", property.toString()).header("Authorization", bearer(session))).andExpect(status().isForbidden());
        }
        for (String role : new String[]{"GERENCIA", "SUPER_ADMIN"}) {
            mvc.perform(get(ROUTE).param("propertyId", property.toString()).header("Authorization", bearer(staff(role, property)))).andExpect(status().isOk());
        }
        mvc.perform(get(ROUTE).param("propertyId", otherProperty.toString()).header("Authorization", bearer(reception))).andExpect(status().isForbidden());
        jdbc.update("DELETE FROM role_permissions WHERE role_code='RECEPCION' AND permission_code='RESERVATION_MANAGE'");
        mvc.perform(get(ROUTE).param("propertyId", property.toString()).header("Authorization", bearer(reception))).andExpect(status().isForbidden());
    }

    @Test
    void inactiveMembershipAndForeignOrganizationFailClosed() throws Exception {
        jdbc.update("UPDATE membership_properties SET status='INACTIVE' WHERE staff_user_id=?", reception.staffUserId());
        mvc.perform(get(ROUTE).param("propertyId", property.toString()).header("Authorization", bearer(reception))).andExpect(status().isUnauthorized());
        var admin = staff("SUPER_ADMIN", property);
        UUID org = UUID.randomUUID();
        jdbc.update("INSERT INTO organizations(id,name,code,status,created_at,updated_at) VALUES (?,'Foreign',?,'ACTIVE',now(),now())", org, org.toString());
        jdbc.update("UPDATE properties SET organization_id=? WHERE id=?", org, otherProperty);
        mvc.perform(get(ROUTE).param("propertyId", otherProperty.toString()).header("Authorization", bearer(admin))).andExpect(status().isForbidden());
    }

    @Test
    void rejectsUnknownDuplicateMissingAndMalformedParameters() throws Exception {
        for (String route : new String[]{ROUTE, ROUTE + "/" + reservation}) {
            mvc.perform(get(route).header("Authorization", bearer(reception))).andExpect(status().isBadRequest());
            mvc.perform(get(route).param("propertyId", "invalid").header("Authorization", bearer(reception))).andExpect(status().isBadRequest());
            mvc.perform(get(route).param("propertyId", property.toString(), property.toString()).header("Authorization", bearer(reception))).andExpect(status().isBadRequest());
            mvc.perform(get(route).param("propertyId", property.toString()).param("scope", "ALL_PROPERTIES").header("Authorization", bearer(reception))).andExpect(status().isBadRequest());
        }
        for (String invalidId : new String[]{"invalid", "1-1-1-1-1"})
            mvc.perform(get(ROUTE + "/" + invalidId).param("propertyId", property.toString()).header("Authorization", bearer(reception))).andExpect(status().isBadRequest());
    }

    private UUID firstStay() {
        return jdbc.queryForObject("SELECT id FROM reservation_stays WHERE reservation_id=? ORDER BY id LIMIT 1", UUID.class, reservation);
    }
    private String assignmentRoute(UUID stay) { return ROUTE + "/" + reservation + "/stays/" + stay + "/room-assignment"; }
    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder assign(UUID stay, UUID room) {
        return org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(assignmentRoute(stay))
                .param("propertyId", property.toString()).header("Authorization", bearer(reception))
                .contentType("application/json").content("{\"room_id\":\"" + room + "\"}");
    }
    private UUID outage(UUID room, String kind, LocalDate from, LocalDate until) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO out_of_order_records(id,property_id,room_id,kind,start_date,end_date,reason,created_by,created_at) VALUES (?,?,?,?,?,?,'test',?,now())",
                id, property, room, kind, from, until, reception.staffUserId());
        return id;
    }

    @Test
    void initialAssignmentPersistsAuditsAndNeverOverwritesEvenOnRetry() throws Exception {
        UUID stay = firstStay(), room = insertRoom(property, type);
        mvc.perform(get(assignmentRoute(stay)).param("propertyId", property.toString()).header("Authorization", bearer(reception)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.rooms[0].room_id").value(room.toString()));
        mvc.perform(assign(stay, room)).andExpect(status().isOk()).andExpect(jsonPath("$.room_id").value(room.toString()));
        entityManager.flush(); entityManager.clear();
        mvc.perform(get(ROUTE + "/" + reservation).param("propertyId", property.toString()).header("Authorization", bearer(reception)))
                .andExpect(jsonPath("$.stays[0].room.roomId").value(room.toString())).andExpect(jsonPath("$.stays[0].status").value("RESERVED"));
        assertEquals(reception.staffUserId(), jdbc.queryForObject("SELECT actor_id FROM reservation_audit_events WHERE entity_id=? AND action='RESERVATION_STAY_ROOM_ASSIGNED' AND actor_type='STAFF' AND property_id=?", UUID.class, stay, property));
        mvc.perform(assign(stay, room)).andExpect(status().isConflict());
        mvc.perform(assign(stay, insertRoom(property, type))).andExpect(status().isConflict());
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM reservation_audit_events WHERE entity_id=?", Integer.class, stay));
    }

    @Test
    void excludesBothOutageKindsAndRevalidatesAfterPreviewButAllowsExclusiveBoundariesAndReleasedBlocks() throws Exception {
        UUID stay = firstStay(), room = insertRoom(property, type);
        for (String kind : new String[]{"OOO", "OOS"}) {
            UUID block = outage(room, kind, FIRST.plusDays(1), FIRST.plusDays(3));
            mvc.perform(get(assignmentRoute(stay)).param("propertyId", property.toString()).header("Authorization", bearer(reception)))
                    .andExpect(jsonPath("$.rooms").isEmpty());
            mvc.perform(assign(stay, room)).andExpect(status().isConflict());
            jdbc.update("UPDATE out_of_order_records SET released_at=now(),released_by=?,release_reason='test' WHERE id=?", reception.staffUserId(), block); entityManager.clear();
        }
        outage(room, "OOO", FIRST.minusDays(1), FIRST);
        outage(room, "OOS", FIRST.plusDays(2), FIRST.plusDays(3));
        mvc.perform(assign(stay, room)).andExpect(status().isOk());
    }

    @Test
    void roomConflictUsesHalfOpenDatesAndActiveTravelStates() throws Exception {
        UUID stay = firstStay(), room = insertRoom(property, type);
        UUID other = insertReservation(property, "CONFIRMED", "GTQ");
        insertStay(property, type, other, "IN_HOUSE", FIRST.plusDays(1), FIRST.plusDays(3));
        jdbc.update("UPDATE reservation_stays SET room_id=? WHERE reservation_id=?", room, other);
        mvc.perform(assign(stay, room)).andExpect(status().isConflict());
        jdbc.update("UPDATE reservation_stays SET arrival=?,departure=? WHERE reservation_id=?", FIRST.minusDays(2), FIRST, other);
        entityManager.clear();
        mvc.perform(assign(stay, room)).andExpect(status().isOk());
    }

    @Test
    void assignmentRejectsTypeScopePairingTerminalStatusAndGuestAndRequiresCurrentPermission() throws Exception {
        UUID stay = firstStay(), room = insertRoom(property, type);
        mvc.perform(assign(stay, insertRoom(property, insertRoomType(property)))).andExpect(status().isConflict());
        mvc.perform(assign(stay, insertRoom(otherProperty, insertRoomType(otherProperty)))).andExpect(status().isNotFound());
        mvc.perform(assign(UUID.randomUUID(), room)).andExpect(status().isNotFound());
        mvc.perform(assign(stay, room).param("propertyId", otherProperty.toString())).andExpect(status().isBadRequest());
        mvc.perform(assign(stay, room).with(request -> { request.removeHeader("Authorization"); request.addHeader("Authorization", "Bearer " + guestJwt.issue(new GuestPrincipal(UUID.randomUUID(), UUID.randomUUID(), "guest@example.test"), Instant.now())); return request; }))
                .andExpect(status().isUnauthorized());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(assignmentRoute(stay)).param("propertyId", property.toString())
                .contentType("application/json").content("{\"room_id\":\"" + room + "\"}")).andExpect(status().isUnauthorized());
        for (String state : new String[]{"IN_HOUSE", "CHECKED_OUT", "CANCELLED", "NO_SHOW"}) {
            jdbc.update("UPDATE reservation_stays SET status=? WHERE id=?", state, stay); entityManager.clear();
            mvc.perform(assign(stay, room)).andExpect(status().isConflict());
        }
        jdbc.update("UPDATE reservation_stays SET status='RESERVED' WHERE id=?", stay);
        jdbc.update("UPDATE reservations SET status='CANCELLED' WHERE id=?", reservation); entityManager.clear();
        mvc.perform(assign(stay, room)).andExpect(status().isConflict());
        jdbc.update("DELETE FROM role_permissions WHERE role_code='RECEPCION' AND permission_code='RESERVATION_MANAGE'");
        mvc.perform(assign(stay, room)).andExpect(status().isForbidden());
    }

    @Test
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void concurrentCommandsCannotDoubleBookRoomOrOverwriteStay() throws Exception {
        UUID stay = firstStay(), room = insertRoom(property, type);
        insertStay(property, type, reservation, "RESERVED", FIRST, FIRST.plusDays(2));
        UUID second = jdbc.queryForObject("SELECT id FROM reservation_stays WHERE reservation_id=? AND id<>?", UUID.class, reservation, stay);
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var gate = new java.util.concurrent.CountDownLatch(1);
            var a = executor.submit(() -> { gate.await(); return mvc.perform(assign(stay, room)).andReturn().getResponse().getStatus(); });
            var b = executor.submit(() -> { gate.await(); return mvc.perform(assign(second, room)).andReturn().getResponse().getStatus(); });
            gate.countDown();
            assertEquals(java.util.Set.of(200,409), java.util.Set.of(a.get(20, java.util.concurrent.TimeUnit.SECONDS), b.get(20, java.util.concurrent.TimeUnit.SECONDS)));
        }
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM reservation_stays WHERE room_id=?", Integer.class, room));
        UUID unassigned = jdbc.queryForObject("SELECT id FROM reservation_stays WHERE reservation_id=? AND room_id IS NULL", UUID.class, reservation);
        UUID roomA = insertRoom(property, type), roomB = insertRoom(property, type);
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var gate = new java.util.concurrent.CountDownLatch(1);
            var a = executor.submit(() -> { gate.await(); return mvc.perform(assign(unassigned, roomA)).andReturn().getResponse().getStatus(); });
            var b = executor.submit(() -> { gate.await(); return mvc.perform(assign(unassigned, roomB)).andReturn().getResponse().getStatus(); });
            gate.countDown();
            assertEquals(java.util.Set.of(200,409), java.util.Set.of(a.get(20, java.util.concurrent.TimeUnit.SECONDS), b.get(20, java.util.concurrent.TimeUnit.SECONDS)));
        }
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM reservation_audit_events WHERE property_id=? AND action='RESERVATION_STAY_ROOM_ASSIGNED'", Integer.class, property));
    }

    @Test
    void rejectsExtraOrMissingCommandFieldsAndValidatesPropertyScopeBeforeReads() throws Exception {
        UUID stay = firstStay(), room = insertRoom(property, type);
        mvc.perform(assign(stay, room).content("{\"room_id\":\"" + room + "\",\"other\":true}")).andExpect(status().isBadRequest());
        mvc.perform(assign(stay, room).content("{}")).andExpect(status().isBadRequest());
        mvc.perform(get(assignmentRoute(stay)).param("propertyId", otherProperty.toString()).header("Authorization", bearer(reception)))
                .andExpect(status().isForbidden());
        mvc.perform(assign(stay, room).with(request -> { request.setParameter("propertyId", otherProperty.toString()); return request; }))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void assignmentAndAuditRollBackTogether() {
        UUID stay = firstStay(), room = insertRoom(property, type);
        var transaction = new org.springframework.transaction.support.TransactionTemplate(transactionManager);
        assertThrows(IllegalStateException.class, () -> transaction.execute(status -> {
            assignmentService.assign(reception, property, reservation, stay, room);
            entityManager.flush();
            throw new IllegalStateException("Force transaction rollback");
        }));
        assertNull(jdbc.queryForObject("SELECT room_id FROM reservation_stays WHERE id=?", UUID.class, stay));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM reservation_audit_events WHERE entity_id=?", Integer.class, stay));
    }

    private String bearer(StaffPrincipal principal) { return "Bearer " + jwt.issue(principal, Instant.now()); }

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
                id, propertyId, id.toString(), "Deluxe");
        return id;
    }

    private UUID insertRoom(UUID propertyId, UUID typeId) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,?)",
                id, propertyId, typeId, String.valueOf(203 + jdbc.queryForObject("SELECT count(*) FROM rooms WHERE property_id=?", Integer.class, propertyId)));
        return id;
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
