package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.*;
import com.pms.hotelboutique.backend.modules.reservations.domain.Folio;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationStay;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import com.pms.hotelboutique.backend.shared.money.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Committed fixtures in a disposable schema: real HTTP, authorization, SQL, locks and audit. */
@SpringBootTest(properties = "pms.security.jwt-secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class StaffStayLifecycleIntegrationTests {
    private static final String SCHEMA = "staff_lifecycle_" + UUID.randomUUID().toString().replace("-", "");
    private static final UUID ORG = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    @DynamicPropertySource static void schema(DynamicPropertyRegistry p) {
        p.add("spring.datasource.hikari.connection-init-sql", () -> "CREATE SCHEMA IF NOT EXISTS " + SCHEMA + "; SET search_path TO " + SCHEMA);
        p.add("spring.liquibase.default-schema", () -> SCHEMA);
        p.add("spring.liquibase.liquibase-schema", () -> SCHEMA);
        p.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
    }
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired StaffStayLifecycleService lifecycle;
    @Autowired FolioService folios;
    @Autowired StaffJwtService jwt;
    @Autowired GuestJwtService guestJwt;
    @Autowired PlatformTransactionManager transactions;
    @Autowired PublicBookingService publicBooking;
    @Autowired StaffRoomAssignmentService assignments;
    @Autowired com.pms.hotelboutique.backend.modules.inventory.application.AvailabilityService availability;
    @MockitoSpyBean AuditService audit;
    private UUID property, roomType, room, reservation, stay;
    private StaffPrincipal staff;
    private LocalDate today;

    @BeforeEach void fixtures() {
        assertEquals(SCHEMA, jdbc.queryForObject("select current_schema()", String.class));
        property = UUID.randomUUID(); roomType = UUID.randomUUID(); room = UUID.randomUUID();
        reservation = UUID.randomUUID(); stay = UUID.randomUUID();
        today = LocalDate.now(ZoneId.of("America/Guatemala"));
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) VALUES (?,?,?,'Lifecycle QA','America/Guatemala','GTQ','ACTIVE',now(),now())", property, ORG, property.toString());
        staff = staff("RECEPCION", property);
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'STD','Standard')", roomType, property);
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,'101')", room, property, roomType);
        jdbc.update("INSERT INTO reservations(id,property_id,confirmation_code,status,currency,source_channel,created_at,updated_at) VALUES (?,?,?,'CONFIRMED','GTQ','WEB_DIRECTA',now(),now())", reservation, property, reservation.toString().substring(0, 16));
        addStay(stay, room, "RESERVED");
        jdbc.update("INSERT INTO hk_room_states(id,property_id,room_id,status,dnd,created_at,updated_at) VALUES (?,?,?,'INSPECTED',true,now(),now())", UUID.randomUUID(), property, room);
    }

    @Test void httpCheckInAndReplayRecordRealStaffWithoutRepeatingEffects() throws Exception {
        var request = body(); String key = key(); UUID sibling = UUID.randomUUID(); addStay(sibling, null, "RESERVED");
        var result = action("check-in", key, request).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store"))
                .andExpect(jsonPath("$.status").value("IN_HOUSE")).andReturn().getResponse().getContentAsString();
        assertEquals("IN_HOUSE", state()); assertEquals("RESERVED", jdbc.queryForObject("select status from reservation_stays where id=?", String.class, sibling));
        assertEquals("CONFIRMED", jdbc.queryForObject("select status from reservations where id=?", String.class, reservation));
        assertEquals(1, jdbc.queryForObject("select count(*) from reservation_audit_events where property_id=? and action='STAY_CHECKED_IN' and actor_type='STAFF' and actor_id=?", Integer.class, property, staff.staffUserId()));
        int before = events();
        jdbc.update("UPDATE hk_room_states SET status='DIRTY' WHERE room_id=?", room);
        assertEquals(result, action("check-in", key, request).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(before, events()); assertEquals(1, receipts());
        var changed = new LinkedHashMap<>(request); changed.put("expectedUpdatedAt", Instant.EPOCH.toString());
        action("check-in", key, changed).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_REUSED"));
    }

    @Test void paidCheckoutSoilsRoomOnceWithStaffCorrelationAndPreservesDatesAndFolio() throws Exception {
        inHouse(); UUID folio = paidFolio(); var request = body(); String key = key();
        var originalStay = jdbc.queryForMap("SELECT arrival,departure,room_id FROM reservation_stays WHERE id=?", stay);
        var ledger = jdbc.queryForList("SELECT * FROM folio_movements WHERE folio_id=? ORDER BY id", folio);
        int before = events();
        var raw = action("check-out", key, request).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CHECKED_OUT"))
                .andReturn().getResponse().getContentAsString();
        UUID operation = UUID.fromString(json.readTree(raw).path("operationId").asText());
        assertEquals("CHECKED_OUT", state()); assertEquals("DIRTY", cleaning());
        assertEquals(true, jdbc.queryForObject("SELECT dnd FROM hk_room_states WHERE room_id=?", Boolean.class, room));
        assertEquals(staff.staffUserId(), jdbc.queryForObject("SELECT updated_by FROM hk_room_states WHERE room_id=?", UUID.class, room));
        assertEquals(3, events() - before);
        assertEquals(3, jdbc.queryForObject("SELECT count(*) FROM reservation_audit_events WHERE correlation_id=? AND actor_type='STAFF' AND actor_id=?", Integer.class, operation, staff.staffUserId()));
        assertEquals(originalStay, jdbc.queryForMap("SELECT arrival,departure,room_id FROM reservation_stays WHERE id=?", stay));
        assertEquals(ledger, jdbc.queryForList("SELECT * FROM folio_movements WHERE folio_id=? ORDER BY id", folio));
        assertEquals("OPEN", folios.get(folio).status().name());
        assertEquals(raw, action("check-out", key, request).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertEquals(before + 3, events());
        action("check-out", key(), request).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("STALE_STAY"));
    }

    @ParameterizedTest @ValueSource(booleans = {false, true})
    void missingOrEmptyLedgerBlocksInsteadOfAssumingZero(boolean emptyFolio) throws Exception {
        inHouse(); if (emptyFolio) openFolio(); int before = events();
        action("check-out", key(), body()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("BALANCE_UNVERIFIABLE"));
        assertUnchanged(before);
    }

    @Test void debtInAnotherStayFolioIsNotOffsetByCreditAndCanBeRetriedAfterPostingPayment() throws Exception {
        inHouse(); paidFolio(); UUID sibling = UUID.randomUUID(); addStay(sibling, null, "RESERVED");
        var debt = folios.openFolio(new FolioService.OpenFolioCommand(property, Folio.Type.GUEST, "GTQ", reservation, sibling, "Other stay"));
        folios.postCharge(debt.id(), money(2500), staff.staffUserId());
        UUID credit = openFolio(); folios.postPayment(credit, money(2500), staff.staffUserId());
        var request = body(); String key = key(); int before = events();
        action("check-out", key, request).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("OUTSTANDING_BALANCE"));
        assertUnchanged(before);
        folios.postPayment(debt.id(), money(2500), staff.staffUserId());
        action("check-out", key, request).andExpect(status().isOk());
        assertEquals("RESERVED", jdbc.queryForObject("select status from reservation_stays where id=?", String.class, sibling));
    }

    @Test void creditBalanceDoesNotTriggerRefundOrPreventPhysicalDeparture() throws Exception {
        inHouse(); UUID folio = paidFolio(); folios.postPayment(folio, money(100), staff.staffUserId());
        action("check-out", key(), body()).andExpect(status().isOk());
        assertEquals(-100, folios.balanceOf(folio).minorUnits().value());
    }

    @ParameterizedTest @ValueSource(strings = {"PENDING", "CANCELLED"})
    void onlyConfirmedParentCanCheckIn(String status) throws Exception {
        jdbc.update("UPDATE reservations SET status=? WHERE id=?", status, reservation);
        action("check-in", key(), body()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("RESERVATION_NOT_CONFIRMED"));
        assertEquals("RESERVED", state()); assertEquals(0, receipts());
    }

    @ParameterizedTest @ValueSource(strings = {"NONE", "DIRTY", "CLEAN"})
    void physicalRoomMustBeCurrentlyInspected(String cleaning) throws Exception {
        if (cleaning.equals("NONE")) jdbc.update("DELETE FROM hk_room_states WHERE room_id=?", room);
        else jdbc.update("UPDATE hk_room_states SET status=? WHERE room_id=?", cleaning, room);
        action("check-in", key(), body()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ROOM_NOT_INSPECTED"));
        assertEquals("RESERVED", state()); assertEquals(0, events());
    }

    @ParameterizedTest @ValueSource(strings = {"CONFIRMED", "CANCELLED"})
    void aGuestStillInHouseBlocksDeliveryEvenAfterTheirBookedDeparture(String parentStatus) throws Exception {
        UUID otherReservation = UUID.randomUUID(), otherStay = UUID.randomUUID();
        jdbc.update("INSERT INTO reservations(id,property_id,confirmation_code,status,currency,source_channel,created_at,updated_at) VALUES (?,?,?,?,'GTQ','WEB_DIRECTA',now(),now())", otherReservation, property, otherReservation.toString().substring(0, 16), parentStatus);
        jdbc.update("INSERT INTO reservation_stays(id,reservation_id,property_id,room_type_id,room_id,arrival,departure,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'IN_HOUSE',now(),now())", otherStay, otherReservation, property, roomType, room, today.minusDays(3), today.minusDays(1));
        action("check-in", key(), body()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ROOM_UNAVAILABLE"));
        assertEquals("RESERVED", state());
        assertEquals("IN_HOUSE", jdbc.queryForObject("SELECT status FROM reservation_stays WHERE id=?", String.class, otherStay));
    }

    @Test void unassignedStayCannotCheckIn() throws Exception {
        jdbc.update("UPDATE reservation_stays SET room_id=null WHERE id=?", stay);
        action("check-in", key(), body()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ROOM_NOT_ASSIGNED"));
    }

    @ParameterizedTest @ValueSource(strings = {"OOO", "OOS"})
    void roomBlockCreatedAfterAssignmentPreventsCheckIn(String kind) throws Exception {
        jdbc.update("INSERT INTO out_of_order_records(id,property_id,room_id,kind,start_date,end_date,reason,created_by,created_at) VALUES (?,?,?,?,?,?,'QA block',?,now())", UUID.randomUUID(), property, room, kind, today, today.plusDays(1), staff.staffUserId());
        action("check-in", key(), body()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ROOM_BLOCKED"));
    }

    @ParameterizedTest @ValueSource(strings = {"RESERVED", "IN_HOUSE"})
    void otherStayOccupancyIsRevalidatedWithoutCountingTheStayItself(String state) throws Exception {
        addStay(UUID.randomUUID(), room, state);
        action("check-in", key(), body()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ROOM_UNAVAILABLE"));
    }

    @ParameterizedTest @ValueSource(ints = {-3, 1})
    void arrivalWindowRejectsPastAndFutureNights(int shift) throws Exception {
        jdbc.update("UPDATE reservation_stays SET arrival=?,departure=? WHERE id=?", today.plusDays(shift), today.plusDays(shift + 1), stay);
        action("check-in", key(), body()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("OUTSIDE_ARRIVAL_DATES"));
    }

    @ParameterizedTest @ValueSource(strings = {"Pacific/Kiritimati", "Etc/GMT+12"})
    void arrivalDateUsesThePropertyTimezoneInsteadOfServerUtc(String timezone) throws Exception {
        LocalDate local = LocalDate.now(ZoneId.of(timezone));
        jdbc.update("UPDATE properties SET timezone=? WHERE id=?", timezone, property);
        jdbc.update("UPDATE reservation_stays SET arrival=?,departure=? WHERE id=?", local, local.plusDays(1), stay);
        action("check-in", key(), body()).andExpect(status().isOk());
    }

    @ParameterizedTest @ValueSource(strings = {"RESERVED", "CANCELLED", "NO_SHOW", "CHECKED_OUT"})
    void checkoutRejectsEveryNonInHouseState(String state) throws Exception {
        jdbc.update("UPDATE reservation_stays SET status=? WHERE id=?", state, stay);
        var request = body(); request.put("expectedStatus", "IN_HOUSE");
        action("check-out", key(), request).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("STALE_STAY"));
        assertEquals(state, state()); assertEquals("INSPECTED", cleaning()); assertEquals(0, events());
    }

    @Test void changedVersionOrRoomPreventsActingOnStaleDetail() throws Exception {
        var request = body(); request.put("expectedUpdatedAt", Instant.EPOCH.toString());
        action("check-in", key(), request).andExpect(status().isConflict());
        request = body(); request.put("expectedRoomId", UUID.randomUUID().toString());
        action("check-in", key(), request).andExpect(status().isConflict());
        assertEquals("RESERVED", state()); assertEquals(0, receipts());
    }

    @Test void strictHttpContractRejectsUnknownMalformedAndMissingValues() throws Exception {
        for (var extra : List.of(Map.of("actorId", staff.staffUserId().toString()), Map.of("expectedUpdatedAt", "invalid"),
                Map.of("expectedRoomId", "1-1-1-1-1"), Map.of("expectedStatus", "CHECKED_OUT"))) {
            var request = body(); request.putAll(extra);
            action("check-in", key(), request).andExpect(status().isBadRequest());
        }
        var request = body(); request.remove("expectedUpdatedAt"); action("check-in", key(), request).andExpect(status().isBadRequest());
        mvc.perform(post(path("check-in")).param("propertyId", property.toString()).header("Authorization", bearer(staff))
                .contentType("application/json").content(json.writeValueAsString(body()))).andExpect(status().isBadRequest());
        action("check-in", "short", body()).andExpect(status().isBadRequest());
        mvc.perform(post(path("check-in")).param("propertyId", property.toString(), property.toString()).header("Authorization", bearer(staff))
                .header("Idempotency-Key", key()).contentType("application/json").content(json.writeValueAsString(body()))).andExpect(status().isBadRequest());
        assertEquals(0, events());
    }

    @Test void staffSessionPermissionsAndPropertyAreRequiredAlsoOnReplay() throws Exception {
        String guest = guestJwt.issue(new GuestPrincipal(UUID.randomUUID(), UUID.randomUUID(), "guest@example.test"), Instant.now());
        for (String token : List.of("Bearer invalid", "Bearer " + guest, "")) request("check-in", key(), body(), token, property, reservation, stay).andExpect(status().isUnauthorized());
        request("check-in", key(), body(), bearer(staff("OPERACIONES", property)), property, reservation, stay).andExpect(status().isForbidden());
        request("check-in", key(), body(), bearer(staff), UUID.randomUUID(), reservation, stay).andExpect(status().isForbidden());
        request("check-in", key(), body(), bearer(staff), property, UUID.randomUUID(), stay).andExpect(status().isNotFound());
        request("check-in", key(), body(), bearer(staff), property, reservation, UUID.randomUUID()).andExpect(status().isNotFound());
        String key = key(); var body = body(); action("check-in", key, body).andExpect(status().isOk());
        jdbc.update("UPDATE auth_sessions SET status='REVOKED',revoked_at=now() WHERE id=?", staff.sessionId());
        action("check-in", key, body).andExpect(status().isUnauthorized());
    }

    @Test void auditFailureRollsBackDepartureCleaningAndReceipt() {
        inHouse(); paidFolio(); var expected = expectation(); int before = events();
        var snapshot = jdbc.queryForMap("SELECT * FROM reservation_stays WHERE id=?", stay);
        doThrow(new AuditException("QA rollback")).when(audit).record(argThat(c -> c != null && c.action().equals("STAY_CHECKED_OUT")));
        assertThrows(AuditException.class, () -> lifecycle.checkOut(staff, property, reservation, stay, key(), expected));
        assertEquals(snapshot, jdbc.queryForMap("SELECT * FROM reservation_stays WHERE id=?", stay));
        assertUnchanged(before);
    }

    @Test void simultaneousIdenticalCheckoutReplaysTheSameReceipt() throws Exception {
        inHouse(); paidFolio(); var expected = expectation(); String key = key();
        var pool = Executors.newFixedThreadPool(2); var start = new CountDownLatch(1); int before = events();
        Callable<StaffStayLifecycleService.Result> command = () -> { await(start); return lifecycle.checkOut(staff, property, reservation, stay, key, expected); };
        try {
            var a = pool.submit(command); var b = pool.submit(command); start.countDown();
            assertEquals(a.get(30, TimeUnit.SECONDS), b.get(30, TimeUnit.SECONDS));
            assertEquals(3, events() - before); assertEquals(1, receipts());
        } finally { start.countDown(); pool.shutdownNow(); }
    }

    @ParameterizedTest @ValueSource(booleans = {false, true})
    void checkoutWaitsForPostingOrNewFolioThenSeesTheCommittedDebt(boolean newFolio) throws Exception {
        inHouse(); UUID paid = paidFolio(); var expected = expectation();
        var pool = Executors.newFixedThreadPool(2); var holding = new CountDownLatch(1); var release = new CountDownLatch(1);
        try {
            var writer = pool.submit(() -> new TransactionTemplate(transactions).executeWithoutResult(tx -> {
                UUID target = newFolio ? openFolio() : paid;
                folios.postCharge(target, money(10), staff.staffUserId()); holding.countDown(); await(release);
            }));
            assertTrue(holding.await(30, TimeUnit.SECONDS));
            var checkout = pool.submit(() -> lifecycle.checkOut(staff, property, reservation, stay, key(), expected));
            assertThrows(TimeoutException.class, () -> checkout.get(250, TimeUnit.MILLISECONDS));
            release.countDown(); writer.get(30, TimeUnit.SECONDS);
            var failure = assertThrows(ExecutionException.class, () -> checkout.get(30, TimeUnit.SECONDS));
            assertEquals("OUTSTANDING_BALANCE", assertInstanceOf(StaffStayLifecycleService.Conflict.class, failure.getCause()).code());
            assertEquals("IN_HOUSE", state()); assertEquals("INSPECTED", cleaning()); assertEquals(0, receipts());
        } finally { release.countDown(); pool.shutdownNow(); }
    }

    @Test void scopedLocksDoNotLockThePropertyRowHeldByPublicBookingEligibility() throws Exception {
        inHouse(); paidFolio(); var expected = expectation();
        var holding = new CountDownLatch(1); var release = new CountDownLatch(1); var pool = Executors.newFixedThreadPool(2);
        try {
            var reader = pool.submit(() -> new TransactionTemplate(transactions).executeWithoutResult(tx -> {
                jdbc.queryForObject("SELECT id FROM properties WHERE id=? FOR SHARE", UUID.class, property);
                holding.countDown(); await(release);
            }));
            assertTrue(holding.await(30, TimeUnit.SECONDS));
            var checkout = pool.submit(() -> lifecycle.checkOut(staff, property, reservation, stay, key(), expected));
            assertEquals("CHECKED_OUT", checkout.get(10, TimeUnit.SECONDS).status());
            release.countDown(); reader.get(30, TimeUnit.SECONDS);
        } finally { release.countDown(); pool.shutdownNow(); }
    }

    @Test void publicSimulationToStaffDepartureUsesTheSamePersistedLedgerAndImmutableReceipt() throws Exception {
        UUID originalStay = stay;
        UUID physical = UUID.randomUUID();
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,'202')", physical, property, roomType);
        jdbc.update("INSERT INTO hk_room_states(id,property_id,room_id,status,dnd,created_at,updated_at) VALUES (?,?,?,'INSPECTED',false,now(),now())", UUID.randomUUID(), property, physical);
        var request = new PublicBookingRequest(property, today, today.plusDays(2), "GTQ", 130000L,
                List.of(new PublicBookingRequest.Stay(roomType, "DEMO_STANDARD", 1)),
                new PublicBookingRequest.BookingGuest("Public", "Guest", "public@example.test"), PublicBookingRequest.PaymentMode.SIMULATED_CARD);
        String bookingKey = key(); var confirmed = publicBooking.book(bookingKey, request);
        reservation = confirmed.reservationId(); stay = confirmed.stays().getFirst().reservationStayId(); room = physical;
        assignments.assign(staff, property, reservation, stay, room);
        action("check-in", key(), body()).andExpect(status().isOk());
        var dates = new com.pms.hotelboutique.backend.modules.inventory.application.StayDateRange(today, today.plusDays(2));
        assertEquals(0, availability.calculateATS(property, roomType, dates));
        action("check-out", key(), body()).andExpect(status().isOk());
        assertEquals(1, availability.calculateATS(property, roomType, dates));
        assertEquals("DIRTY", cleaning());
        assertEquals(confirmed, publicBooking.book(bookingKey, request));
        UUID folio = jdbc.queryForObject("SELECT id FROM folios WHERE reservation_id=?", UUID.class, reservation);
        assertEquals(0, folios.balanceOf(folio).minorUnits().value());
        assertEquals(2, folios.movementsOf(folio).size());
        assertEquals("RESERVED", jdbc.queryForObject("SELECT status FROM reservation_stays WHERE id=?", String.class, originalStay));
    }

    @Test void differentKeysCannotCompleteTheSameDepartureTwice() throws Exception {
        inHouse(); paidFolio(); var expected = expectation(); int before = events();
        var start = new CountDownLatch(1); var pool = Executors.newFixedThreadPool(2);
        Callable<Boolean> command = () -> {
            await(start);
            try { lifecycle.checkOut(staff, property, reservation, stay, key(), expected); return true; }
            catch (StaffStayLifecycleService.Conflict error) { assertEquals("STALE_STAY", error.code()); return false; }
        };
        try {
            var first = pool.submit(command); var second = pool.submit(command); start.countDown();
            assertEquals(1, (first.get(30, TimeUnit.SECONDS) ? 1 : 0) + (second.get(30, TimeUnit.SECONDS) ? 1 : 0));
            assertEquals(before + 3, events()); assertEquals(1, receipts());
        } finally { start.countDown(); pool.shutdownNow(); }
    }

    @Test void permissionRemovalAlsoDeniesAnExistingReceiptReplay() throws Exception {
        var request = body(); String key = key(); action("check-in", key, request).andExpect(status().isOk());
        jdbc.update("DELETE FROM role_permissions WHERE role_code='RECEPCION' AND permission_code='RESERVATION_MANAGE'");
        try { action("check-in", key, request).andExpect(status().isForbidden()); }
        finally { jdbc.update("INSERT INTO role_permissions(role_code,permission_code) VALUES ('RECEPCION','RESERVATION_MANAGE')"); }
    }

    @Test void historicalUnassignedStayCanLeaveWithoutInventingAHousekeepingEffect() throws Exception {
        inHouse(); paidFolio(); jdbc.update("UPDATE reservation_stays SET room_id=null WHERE id=?", stay);
        int before = events();
        action("check-out", key(), body()).andExpect(status().isOk());
        assertEquals("CHECKED_OUT", state()); assertEquals("INSPECTED", cleaning()); assertEquals(2, events() - before);
    }

    @Test void lateArrivalInsideTheBookedWindowIsAllowed() throws Exception {
        jdbc.update("UPDATE reservation_stays SET arrival=? WHERE id=?", today.minusDays(1), stay);
        action("check-in", key(), body()).andExpect(status().isOk());
    }

    @Test void debtInAnotherCurrencyCannotBeOffsetByCredit() throws Exception {
        inHouse(); UUID credit = openFolio(); folios.postPayment(credit, money(10000), staff.staffUserId());
        var debt = folios.openFolio(new FolioService.OpenFolioCommand(property, Folio.Type.GUEST, "USD", reservation, null, "USD account"));
        folios.postCharge(debt.id(), new FolioService.MovementAmount(new MonetaryAmount(new MinorUnits(100), Currency.getInstance("USD")), "USD charge"), staff.staffUserId());
        action("check-out", key(), body()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("OUTSTANDING_BALANCE"));
        assertEquals("IN_HOUSE", state());
    }

    private String path(String action) { return "/api/v1/reservations/" + reservation + "/stays/" + stay + "/" + action; }
    private ResultActions action(String action, String key, Map<String, Object> body) throws Exception {
        return request(action, key, body, bearer(staff), property, reservation, stay);
    }
    private ResultActions request(String action, String key, Map<String, Object> body, String token, UUID propertyId, UUID reservationId, UUID stayId) throws Exception {
        return mvc.perform(post("/api/v1/reservations/" + reservationId + "/stays/" + stayId + "/" + action)
                .param("propertyId", propertyId.toString()).header("Authorization", token).header("Idempotency-Key", key)
                .contentType("application/json").content(json.writeValueAsString(body)));
    }
    private Map<String, Object> body() {
        var expected = expectation(); var body = new LinkedHashMap<String, Object>();
        body.put("expectedStatus", expected.status().name()); body.put("expectedUpdatedAt", expected.updatedAt().toString());
        body.put("expectedRoomId", expected.roomId() == null ? null : expected.roomId().toString()); return body;
    }
    private StaffStayLifecycleService.Expectation expectation() {
        return new StaffStayLifecycleService.Expectation(ReservationStay.Status.valueOf(state()),
                jdbc.queryForObject("SELECT updated_at FROM reservation_stays WHERE id=?", java.sql.Timestamp.class, stay).toInstant(),
                jdbc.queryForObject("SELECT room_id FROM reservation_stays WHERE id=?", UUID.class, stay));
    }
    private void inHouse() { jdbc.update("UPDATE reservation_stays SET status='IN_HOUSE' WHERE id=?", stay); }
    private String state() { return jdbc.queryForObject("SELECT status FROM reservation_stays WHERE id=?", String.class, stay); }
    private String cleaning() { return jdbc.queryForObject("SELECT status FROM hk_room_states WHERE room_id=?", String.class, room); }
    private int events() { return jdbc.queryForObject("SELECT count(*) FROM reservation_audit_events WHERE property_id=?", Integer.class, property); }
    private int receipts() { return jdbc.queryForObject("SELECT count(*) FROM local_operation_receipts WHERE property_id=?", Integer.class, property); }
    private void assertUnchanged(int auditBefore) { assertEquals("IN_HOUSE", state()); assertEquals("INSPECTED", cleaning()); assertEquals(auditBefore, events()); assertEquals(0, receipts()); }
    private String key() { return UUID.randomUUID().toString(); }
    private String bearer(StaffPrincipal principal) { return "Bearer " + jwt.issue(principal, Instant.now()); }
    private UUID openFolio() { return folios.openFolio(new FolioService.OpenFolioCommand(property, Folio.Type.GUEST, "GTQ", reservation, null, "QA folio")).id(); }
    private UUID paidFolio() {
        UUID id = openFolio(); folios.postCharge(id, money(10000), staff.staffUserId());
        folios.postPayment(id, money(10000), staff.staffUserId()); return id;
    }
    private FolioService.MovementAmount money(long minor) { return new FolioService.MovementAmount(new MonetaryAmount(new MinorUnits(minor), Currency.getInstance("GTQ")), "QA posting"); }
    private void addStay(UUID id, UUID roomId, String status) {
        jdbc.update("INSERT INTO reservation_stays(id,reservation_id,property_id,room_type_id,room_id,arrival,departure,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?, ?,now(),now())", id, reservation, property, roomType, roomId, today, today.plusDays(2), status);
    }
    private StaffPrincipal staff(String role, UUID propertyId) {
        UUID id = UUID.randomUUID(), session = UUID.randomUUID();
        jdbc.update("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) VALUES (?,?,?,'test-only-unused-hash',?,'ACTIVE',now(),now())", id, id.toString(), id + "@example.test", role);
        jdbc.update("INSERT INTO organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())", id, ORG, role);
        jdbc.update("INSERT INTO membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())", id, ORG, propertyId);
        jdbc.update("INSERT INTO auth_sessions(id,context,staff_user_id,status,expires_at,created_at) VALUES (?,'STAFF',?,'ACTIVE',now()+interval '1 day',now())", session, id);
        return new StaffPrincipal(id, session, id.toString(), role);
    }
    private static void await(CountDownLatch latch) {
        try { assertTrue(latch.await(30, TimeUnit.SECONDS)); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new AssertionError(e); }
    }
}
