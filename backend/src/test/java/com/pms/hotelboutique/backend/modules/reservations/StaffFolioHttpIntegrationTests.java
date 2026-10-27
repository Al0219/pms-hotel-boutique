package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.*;
import com.pms.hotelboutique.backend.modules.reservations.application.StaffFolioModels.*;
import com.pms.hotelboutique.backend.modules.reservations.application.StaffFolioModels.PaymentRequest;
import com.pms.hotelboutique.backend.modules.reservations.domain.*;
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
import org.springframework.test.web.servlet.*;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Disposable schema, committed fixtures: real authorization, ledger, advisory locks and HTTP. */
@SpringBootTest(properties = "pms.security.jwt-secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class StaffFolioHttpIntegrationTests {
    private static final String SCHEMA = "folio_http_" + UUID.randomUUID().toString().replace("-", "");
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
    @Autowired StaffJwtService jwt;
    @Autowired GuestJwtService guestJwt;
    @Autowired FolioService folios;
    @Autowired StaffFolioHttpService http;
    @Autowired StaffStayLifecycleService lifecycle;
    @MockitoSpyBean AuditService audit;
    private UUID property, reservation, folio, stay;
    private StaffPrincipal staff;

    @BeforeEach void fixtures() {
        assertEquals(SCHEMA, jdbc.queryForObject("select current_schema()", String.class));
        property = UUID.randomUUID(); reservation = UUID.randomUUID(); stay = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) VALUES (?,?,?,'Folio QA','America/Guatemala','GTQ','ACTIVE',now(),now())", property, ORG, property.toString());
        jdbc.update("INSERT INTO reservations(id,property_id,confirmation_code,status,currency,source_channel,created_at,updated_at) VALUES (?,?,?,'CONFIRMED','GTQ','WALK_IN',now(),now())", reservation, property, reservation.toString().substring(0, 16));
        UUID type = UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'STD','Standard')", type, property);
        jdbc.update("INSERT INTO reservation_stays(id,reservation_id,property_id,room_type_id,arrival,departure,status,created_at,updated_at) VALUES (?,?,?,?,current_date,current_date+2,'IN_HOUSE',now(),now())", stay, reservation, property, type);
        staff = staff("RECEPCION", property);
        folio = open(Folio.Type.GUEST);
        folios.postCharge(folio, amount(10000), staff.staffUserId());
    }

    @Test void partialThenFullPaymentUnblocksCheckoutAndPreservesLedgerAndFolio() throws Exception {
        var original = jdbc.queryForList("SELECT * FROM folio_movements WHERE folio_id=?", folio);
        var expected = new StaffStayLifecycleService.Expectation(ReservationStay.Status.IN_HOUSE,
                jdbc.queryForObject("SELECT updated_at FROM reservation_stays WHERE id=?", java.sql.Timestamp.class, stay).toInstant(), null);
        pay("30.25", key()).andExpect(status().isCreated()).andExpect(jsonPath("$.amount.amount").value("30.25"));
        assertEquals(6975, balance());
        assertEquals("OUTSTANDING_BALANCE", assertThrows(StaffStayLifecycleService.Conflict.class,
                () -> lifecycle.checkOut(staff, property, reservation, stay, key(), expected)).code());
        pay("69.75", key()).andExpect(status().isCreated());
        assertEquals(0, balance()); assertEquals("OPEN", folios.get(folio).status().name());
        assertEquals("CHECKED_OUT", lifecycle.checkOut(staff, property, reservation, stay, key(), expected).status());
        assertEquals(original.getFirst(), jdbc.queryForMap("SELECT * FROM folio_movements WHERE id=?", original.getFirst().get("id")));
        assertEquals(2, count("local_operation_receipts", "operation_name='STAFF_FOLIO_PAYMENT'"));
        assertEquals(2, count("folio_movements", "kind='PAYMENT'"));
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM folio_movements m JOIN folios f ON f.id=m.folio_id WHERE f.property_id=? AND m.kind='PAYMENT' AND m.amount_minor<0 AND m.created_by=?", Integer.class, property, staff.staffUserId()));
    }

    @Test void replayAfterZeroBalanceOrClosureReturnsExactOriginalAndChangedPayloadConflicts() throws Exception {
        String key = key(); String raw = pay("100.00", key).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        folios.settle(folio); folios.close(folio);
        int events = events();
        assertEquals(raw, pay("100.00", key).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        pay("99.00", key).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_REUSED"));
        assertEquals(events, events()); assertEquals(1, count("local_operation_receipts", "true"));
    }

    @ParameterizedTest @ValueSource(strings = {"0", "-1.00", "100.01", "1.001", "1e2", "9999999999999999999.99"})
    void rejectsNonpositiveOverpaymentPrecisionAndOverflowWithoutEffects(String value) throws Exception {
        int before = events();
        pay(value, key()).andExpect(status().is(value.equals("100.01") ? 409 : 400));
        assertEquals(10000, balance()); assertEquals(before, events()); assertEquals(0, count("local_operation_receipts", "true"));
    }

    @Test void wrongCurrencyUnknownKeysAndNumericCoercionAreRejected() throws Exception {
        for (String body : List.of(
                "{\"amount\":{\"amount\":\"1.00\",\"currency\":\"USD\"},\"description\":\"Cash\"}",
                "{\"amount\":{\"amount\":1,\"currency\":\"GTQ\"},\"description\":\"Cash\"}",
                "{\"amount\":{\"amount\":\"1.00\",\"currency\":\"GTQ\",\"pan\":\"x\"},\"description\":\"Cash\"}",
                "{\"amount\":{\"amount\":\"1.00\",\"currency\":\"GTQ\"},\"description\":\"Cash\",\"actorId\":\"x\"}",
                "{\"amount\":{\"amount\":\"1.00\",\"currency\":\"GTQ\"},\"description\":\"   \"}")) {
            rawPay(body, key(), bearer(staff)).andExpect(status().isBadRequest());
        }
        assertEquals(10000, balance()); assertEquals(0, count("local_operation_receipts", "true"));
    }

    @Test void boundsChunkedBodyAndRejectsTrailingJsonAndBadKey() throws Exception {
        rawPay(" ".repeat(2049), key(), bearer(staff)).andExpect(status().isBadRequest());
        rawPay(body("1.00") + "{}", key(), bearer(staff)).andExpect(status().isBadRequest());
        rawPay("null", key(), bearer(staff)).andExpect(status().isBadRequest());
        rawPay(body("1.00"), "short", bearer(staff)).andExpect(status().isBadRequest());
        assertEquals(10000, balance()); assertEquals(0, count("local_operation_receipts", "true"));
    }

    @Test void nonGuestClosedUnlinkedAndEmptyFoliosCannotReceivePayments() throws Exception {
        UUID original = folio;
        folio = open(Folio.Type.COMPANY); folios.postCharge(folio, amount(10000), staff.staffUserId());
        pay("1.00", key()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("FOLIO_NOT_PAYABLE"));
        folio = open(Folio.Type.GUEST);
        pay("1.00", key()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("BALANCE_UNVERIFIABLE"));
        folio = folios.openFolio(new FolioService.OpenFolioCommand(property, Folio.Type.GUEST, "GTQ", null, null, null)).id();
        pay("1.00", key()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("FOLIO_NOT_PAYABLE"));
        folio = original; folios.postPayment(folio, amount(10000), staff.staffUserId()); folios.settle(folio);
        pay("1.00", key()).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("FOLIO_NOT_OPEN"));
    }

    @Test void readsAreScopedPaginatedAndNeverCreateMovements() throws Exception {
        UUID second = open(Folio.Type.MASTER); int before = events();
        String list = mvc.perform(get(base()).param("reservationId", reservation.toString()).param("limit", "1").header("Authorization", bearer(staff)))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "private, no-store"))
                .andExpect(jsonPath("$.items.length()").value(1)).andReturn().getResponse().getContentAsString();
        String cursor = json.readTree(list).path("nextCursor").asText();
        mvc.perform(get(base()).param("reservationId", reservation.toString()).param("limit", "1").param("cursor", cursor).header("Authorization", bearer(staff)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(second.toString())).andExpect(jsonPath("$.nextCursor").isEmpty());
        read("").andExpect(status().isOk()).andExpect(jsonPath("$.balance.amount").value("100.00")).andExpect(jsonPath("$.movementCount").value(1));
        folios.postPayment(folio, amount(100), staff.staffUserId()); before = events();
        String first = read("/movements?limit=1").andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String next = json.readTree(first).path("nextCursor").asText();
        read("/movements?limit=1&cursor=" + next).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].amount.amount").value("-1.00"));
        read("/movements?cursor=" + cursor).andExpect(status().isBadRequest());
        read("/movements?limit=101").andExpect(status().isBadRequest());
        read("?extra=x").andExpect(status().isBadRequest());
        read("/movements?limit=1&limit=2").andExpect(status().isBadRequest());
        assertEquals(before, events()); assertEquals(0, count("local_operation_receipts", "true"));
    }

    @Test void requiresStaffPermissionAndLiveScopeEvenForReplay() throws Exception {
        String request = body("1.00"); String key = key(); pay("1.00", key).andExpect(status().isCreated());
        rawPay(request, key(), null).andExpect(status().isUnauthorized());
        rawPay(request, key(), "Bearer " + guestJwt.issue(new GuestPrincipal(UUID.randomUUID(), UUID.randomUUID(), "qa@example.test"), Instant.now())).andExpect(status().isUnauthorized());
        rawPay(request, key(), bearer(staff("AUDITOR", property))).andExpect(status().isForbidden());
        jdbc.update("UPDATE membership_properties SET status='INACTIVE' WHERE staff_user_id=?", staff.staffUserId());
        // C2 invalidates an identity with no active authorized properties before resolving a resource.
        rawPay(request, key, bearer(staff)).andExpect(status().isUnauthorized());
        jdbc.update("UPDATE membership_properties SET status='ACTIVE' WHERE staff_user_id=?", staff.staffUserId());
        jdbc.update("UPDATE auth_sessions SET status='REVOKED',revoked_at=now() WHERE id=?", staff.sessionId());
        rawPay(request, key, bearer(staff)).andExpect(status().isUnauthorized());
    }

    @Test void missingAndOtherPropertyFolioAreIndistinguishable() throws Exception {
        UUID other = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) VALUES (?,?,?,'Other','UTC','GTQ','ACTIVE',now(),now())", other, ORG, other.toString());
        UUID foreign = folios.openFolio(new FolioService.OpenFolioCommand(other, Folio.Type.GUEST, "GTQ", null, null, null)).id();
        mvc.perform(get("/api/v1/properties/" + other + "/folios/" + foreign).header("Authorization", bearer(staff))).andExpect(status().isForbidden());
        mvc.perform(get(base() + "/" + foreign).header("Authorization", bearer(staff))).andExpect(status().isNotFound());
        mvc.perform(get(base() + "/" + UUID.randomUUID()).header("Authorization", bearer(staff))).andExpect(status().isNotFound());
        mvc.perform(get(base()).param("reservationId", UUID.randomUUID().toString()).header("Authorization", bearer(staff))).andExpect(status().isNotFound());
        folio = foreign; pay("1.00", key()).andExpect(status().isNotFound());
    }

    @Test void concurrentDistinctPaymentsCannotOverpay() throws Exception {
        var start = new CountDownLatch(1); var pool = Executors.newFixedThreadPool(2);
        Callable<Boolean> command = () -> {
            assertTrue(start.await(30, TimeUnit.SECONDS));
            try { http.pay(staff, property, folio, key(), new PaymentRequest(new Money("70.00", "GTQ"), "Cash")); return true; }
            catch (StaffFolioHttpService.Conflict error) { assertEquals("PAYMENT_EXCEEDS_BALANCE", error.code()); return false; }
        };
        try {
            var a = pool.submit(command); var b = pool.submit(command); start.countDown();
            assertEquals(1, (a.get(30, TimeUnit.SECONDS) ? 1 : 0) + (b.get(30, TimeUnit.SECONDS) ? 1 : 0));
            assertEquals(3000, balance()); assertEquals(1, count("local_operation_receipts", "true"));
        } finally { start.countDown(); pool.shutdownNow(); }
    }

    @Test void concurrentSameKeyPostsOnceAndReturnsSameReceipt() throws Exception {
        var start = new CountDownLatch(1); var pool = Executors.newFixedThreadPool(2); String key = key();
        Callable<PaymentReceipt> command = () -> { assertTrue(start.await(30, TimeUnit.SECONDS)); return http.pay(staff, property, folio, key, new PaymentRequest(new Money("100.00", "GTQ"), "Cash")); };
        try {
            var a = pool.submit(command); var b = pool.submit(command); start.countDown();
            assertEquals(a.get(30, TimeUnit.SECONDS), b.get(30, TimeUnit.SECONDS));
            assertEquals(0, balance()); assertEquals(1, count("local_operation_receipts", "true"));
        } finally { start.countDown(); pool.shutdownNow(); }
    }

    @Test void lateAuditFailureRollsBackMovementAndReceipt() {
        int before = events();
        doThrow(new IllegalStateException("QA rollback")).when(audit).record(argThat(c -> c != null && c.action().equals("LOCAL_OPERATION_COMPLETED") && c.propertyId().equals(property)));
        assertThrows(IllegalStateException.class, () -> http.pay(staff, property, folio, key(), new PaymentRequest(new Money("10.00", "GTQ"), "Cash")));
        assertEquals(10000, balance()); assertEquals(before, events()); assertEquals(0, count("local_operation_receipts", "true"));
    }

    private String base() { return "/api/v1/properties/" + property + "/folios"; }
    private ResultActions read(String suffix) throws Exception { return mvc.perform(get(base() + "/" + folio + suffix).header("Authorization", bearer(staff))); }
    private ResultActions pay(String amount, String key) throws Exception { return rawPay(body(amount), key, bearer(staff)); }
    private ResultActions rawPay(String body, String key, String token) throws Exception {
        var request = post(base() + "/" + folio + "/payments").contentType("application/json").header("Idempotency-Key", key).content(body);
        if (token != null) request.header("Authorization", token);
        return mvc.perform(request);
    }
    private String body(String amount) { return "{\"amount\":{\"amount\":\"" + amount + "\",\"currency\":\"GTQ\"},\"description\":\"Cash\"}"; }
    private String key() { return UUID.randomUUID().toString(); }
    private String bearer(StaffPrincipal p) { return "Bearer " + jwt.issue(p, Instant.now()); }
    private long balance() { return folios.balanceOf(folio).minorUnits().value(); }
    private int events() { return jdbc.queryForObject("SELECT count(*) FROM reservation_audit_events WHERE property_id=?", Integer.class, property); }
    private int count(String table, String predicate) {
        if (table.equals("folio_movements")) return jdbc.queryForObject("SELECT count(*) FROM folio_movements m JOIN folios f ON f.id=m.folio_id WHERE f.property_id=? AND " + predicate, Integer.class, property);
        return jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE property_id=? AND " + predicate, Integer.class, property);
    }
    private UUID open(Folio.Type type) { return folios.openFolio(new FolioService.OpenFolioCommand(property, type, "GTQ", reservation, null, "QA account")).id(); }
    private FolioService.MovementAmount amount(long value) { return new FolioService.MovementAmount(new MonetaryAmount(new MinorUnits(value), Currency.getInstance("GTQ")), "QA charge"); }
    private StaffPrincipal staff(String role, UUID propertyId) {
        UUID id = UUID.randomUUID(), session = UUID.randomUUID();
        jdbc.update("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) VALUES (?,?,?,'test-only-unused-hash',?,'ACTIVE',now(),now())", id, id.toString(), id + "@example.test", role);
        jdbc.update("INSERT INTO organization_memberships(staff_user_id,organization_id,role_code,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())", id, ORG, role);
        jdbc.update("INSERT INTO membership_properties(staff_user_id,organization_id,property_id,status,created_at,updated_at) VALUES (?,?,?,'ACTIVE',now(),now())", id, ORG, propertyId);
        jdbc.update("INSERT INTO auth_sessions(id,context,staff_user_id,status,expires_at,created_at) VALUES (?,'STAFF',?,'ACTIVE',now()+interval '1 day',now())", session, id);
        return new StaffPrincipal(id, session, id.toString(), role);
    }
}
