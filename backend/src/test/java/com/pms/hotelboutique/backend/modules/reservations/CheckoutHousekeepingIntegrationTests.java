package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.inventory.application.AvailabilityService;
import com.pms.hotelboutique.backend.modules.inventory.application.StayDateRange;
import com.pms.hotelboutique.backend.modules.operations.application.HousekeepingException;
import com.pms.hotelboutique.backend.modules.operations.application.HousekeepingService;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.HkRoomStateRepository;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.HousekeepingReasonRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.*;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doThrow;

/** Real transactions in a disposable schema; audit failures are injected only here. */
@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class CheckoutHousekeepingIntegrationTests {
    private static final String SCHEMA = "checkout_hk_" + UUID.randomUUID().toString().replace("-", "");
    private static final String REASON = "Salida del huésped: habitación pendiente de limpieza.";
    @DynamicPropertySource static void isolatedSchema(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.hikari.connection-init-sql", () -> "CREATE SCHEMA IF NOT EXISTS " + SCHEMA + "; SET search_path TO " + SCHEMA);
        properties.add("spring.liquibase.default-schema", () -> SCHEMA);
        properties.add("spring.liquibase.liquibase-schema", () -> SCHEMA);
        properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
    }
    @Autowired JdbcTemplate jdbc;
    @Autowired ReservationStayService stays;
    @Autowired HousekeepingService housekeeping;
    @Autowired HkRoomStateRepository states;
    @Autowired HousekeepingReasonRepository reasons;
    @Autowired AvailabilityService availability;
    @Autowired EntityManager entities;
    @Autowired PlatformTransactionManager transactions;
    @MockitoSpyBean AuditService audit;
    private UUID property, type, room, reservation, stay;

    @BeforeEach void fixtures() {
        assertEquals(SCHEMA, jdbc.queryForObject("SELECT current_schema()", String.class));
        property = UUID.randomUUID(); type = UUID.randomUUID(); room = UUID.randomUUID();
        reservation = UUID.randomUUID(); stay = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) VALUES (?,'4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1',?,'Checkout HK QA','America/Guatemala','GTQ','ACTIVE',now(),now())", property, property.toString());
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'QA','QA')", type, property);
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,'101')", room, property, type);
        jdbc.update("INSERT INTO reservations(id,property_id,confirmation_code,status,currency,source_channel,created_at,updated_at) VALUES (?,?,?,'CONFIRMED','GTQ','WEB_DIRECTA',now(),now())", reservation, property, reservation.toString().replace("-", "").substring(0, 10));
        addStay(stay, room, "IN_HOUSE", "2035-01-01", "2035-01-03");
    }
    private void addStay(UUID id, UUID assigned, String status, String arrival, String departure) {
        jdbc.update("INSERT INTO reservation_stays(id,reservation_id,property_id,room_type_id,room_id,arrival,departure,status,created_at,updated_at) VALUES (?,?,?,?,?,CAST(? AS date),CAST(? AS date),?,now(),now())", id, reservation, property, type, assigned, arrival, departure, status);
    }
    private void cleaning(String status) {
        if (status != null) jdbc.update("INSERT INTO hk_room_states(id,property_id,room_id,status,dnd,created_at,updated_at) VALUES (?,?,?,?,true,now(),now())", UUID.randomUUID(), property, room, status);
    }
    private String travel() { return jdbc.queryForObject("SELECT status FROM reservation_stays WHERE id=?", String.class, stay); }
    private int events() { return jdbc.queryForObject("SELECT count(*) FROM reservation_audit_events WHERE property_id=?", Integer.class, property); }
    private int ats(String arrival, String departure) {
        return availability.calculateATS(property, type, new StayDateRange(LocalDate.parse(arrival), LocalDate.parse(departure)));
    }

    @ParameterizedTest @NullSource @ValueSource(strings = {"DIRTY", "CLEAN", "INSPECTED"})
    void successfulCheckoutSoilsOnlyItsPhysicalRoomAndRecordsCorrelatedSystemHistory(String previous) {
        cleaning(previous);
        var out = stays.checkOut(stay);
        assertEquals("CHECKED_OUT", out.status().name()); assertEquals(room, out.roomId());
        var hk = housekeeping.statusOf(property, room);
        assertEquals("DIRTY", hk.status().name()); assertEquals(previous != null, hk.dnd());
        assertNull(hk.updatedBy()); assertEquals(2, events());
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM reservation_audit_events WHERE property_id=? AND correlation_id=? AND actor_type='SYSTEM' AND actor_id IS NULL", Integer.class, property, stay));
        var soiled = jdbc.queryForMap("SELECT before_state,after_state,reason,entity_id FROM reservation_audit_events WHERE property_id=? AND action='HK_SOILED'", property);
        assertEquals(previous == null ? null : "{\"status\":\"" + previous + "\"}", soiled.get("before_state"));
        assertEquals("{\"status\":\"DIRTY\"}", soiled.get("after_state")); assertEquals(REASON, soiled.get("reason"));
        assertEquals(hk.id(), soiled.get("entity_id"));
        assertEquals(REASON, reasons.latestCleaningReasons(property, List.of(hk.id())).getFirst().getReason());
        var ended = jdbc.queryForMap("SELECT before_state,after_state,entity_id FROM reservation_audit_events WHERE property_id=? AND action='STAY_CHECKED_OUT'", property);
        assertEquals("{\"status\":\"IN_HOUSE\"}", ended.get("before_state"));
        assertEquals("{\"status\":\"CHECKED_OUT\"}", ended.get("after_state")); assertEquals(stay, ended.get("entity_id"));
    }

    @Test void releaseDoesNotChangeFuturePreassignmentSiblingStayOrCleaningIndependentInventory() {
        cleaning("INSPECTED");
        UUID secondRoom = UUID.randomUUID(), sibling = UUID.randomUUID(), future = UUID.randomUUID();
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,'102')", secondRoom, property, type);
        jdbc.update("INSERT INTO hk_room_states(id,property_id,room_id,status,dnd,created_at,updated_at) VALUES (?,?,?,'INSPECTED',false,now(),now())", UUID.randomUUID(), property, secondRoom);
        addStay(sibling, secondRoom, "RESERVED", "2035-01-10", "2035-01-12");
        addStay(future, room, "RESERVED", "2035-01-03", "2035-01-05");
        var futureBefore = jdbc.queryForMap("SELECT * FROM reservation_stays WHERE id=?", future);
        var siblingBefore = jdbc.queryForMap("SELECT * FROM reservation_stays WHERE id=?", sibling);
        int soldBefore = ats("2035-01-01", "2035-01-03"), futureATS = ats("2035-01-03", "2035-01-05");
        stays.checkOut(stay);
        assertEquals(soldBefore + 1, ats("2035-01-01", "2035-01-03"));
        assertEquals(futureATS, ats("2035-01-03", "2035-01-05"));
        assertEquals(futureBefore, jdbc.queryForMap("SELECT * FROM reservation_stays WHERE id=?", future));
        assertEquals(siblingBefore, jdbc.queryForMap("SELECT * FROM reservation_stays WHERE id=?", sibling));
        assertEquals("INSPECTED", housekeeping.statusOf(property, secondRoom).status().name());
        assertEquals("CONFIRMED", jdbc.queryForObject("SELECT status FROM reservations WHERE id=?", String.class, reservation));
        housekeeping.markClean(property, room, null); housekeeping.inspect(property, room, null);
        assertEquals(soldBefore + 1, ats("2035-01-01", "2035-01-03"));
    }

    @Test void historicalInHouseStayWithoutRoomEndsWithoutInventingAnAssignmentOrTracking() {
        jdbc.update("UPDATE reservation_stays SET room_id=null WHERE id=?", stay);
        assertEquals("CHECKED_OUT", stays.checkOut(stay).status().name());
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM hk_room_states WHERE property_id=?", Integer.class, property));
        assertEquals(1, events());
    }

    @ParameterizedTest @ValueSource(strings = {"RESERVED", "CANCELLED", "NO_SHOW", "CHECKED_OUT"})
    void invalidCheckoutHasNoCleaningOrAuditSideEffects(String status) {
        jdbc.update("UPDATE reservation_stays SET status=? WHERE id=?", status, stay);
        assertThrows(ReservationStayException.class, () -> stays.checkOut(stay));
        assertEquals(status, travel()); assertEquals(0, events());
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM hk_room_states WHERE property_id=?", Integer.class, property));
    }

    @Test void unknownOrMissingStayDoesNotChangeInventory() {
        assertThrows(ReservationStayException.class, () -> stays.checkOut(null));
        assertThrows(ReservationStayException.class, () -> stays.checkOut(UUID.randomUUID()));
        assertEquals("IN_HOUSE", travel()); assertEquals(0, events());
    }

    @ParameterizedTest @NullSource @ValueSource(strings = "INSPECTED")
    void auditFailureRollsBackTravelCleaningVersionAndAllPreviouslyInsertedEvents(String previous) {
        cleaning(previous);
        var before = jdbc.queryForMap("SELECT * FROM reservation_stays WHERE id=?", stay);
        var hkBefore = jdbc.queryForList("SELECT * FROM hk_room_states WHERE property_id=?", property);
        doThrow(new AuditException("Disposable checkout audit failure")).when(audit)
                .record(argThat(command -> command != null && command.action().equals("STAY_CHECKED_OUT")));
        assertThrows(AuditException.class, () -> stays.checkOut(stay));
        assertEquals(before, jdbc.queryForMap("SELECT * FROM reservation_stays WHERE id=?", stay));
        assertEquals(hkBefore, jdbc.queryForList("SELECT * FROM hk_room_states WHERE property_id=?", property));
        assertEquals(0, events());
    }

    @Test void aDifferentPropertyCannotSoilThisRoomThroughTheInternalHook() {
        cleaning("INSPECTED");
        assertThrows(HousekeepingException.class, () -> housekeeping.markDirtyAfterCheckout(UUID.randomUUID(), room, stay));
        assertEquals("INSPECTED", housekeeping.statusOf(property, room).status().name());
        assertEquals("IN_HOUSE", travel()); assertEquals(0, events());
    }

    @Test void concurrentCheckoutsHaveOnlyOneWinnerAndRetryCannotDuplicateSideEffects() throws Exception {
        cleaning("INSPECTED");
        var start = new CountDownLatch(1); var pool = Executors.newFixedThreadPool(2);
        Callable<Boolean> checkout = () -> {
            await(start);
            try { stays.checkOut(stay); return true; }
            catch (ReservationStayException expected) { return false; }
        };
        try {
            var first = pool.submit(checkout); var second = pool.submit(checkout); start.countDown();
            assertEquals(1, (first.get(30, TimeUnit.SECONDS) ? 1 : 0) + (second.get(30, TimeUnit.SECONDS) ? 1 : 0));
            assertEquals("CHECKED_OUT", travel()); assertEquals(2, events());
            assertThrows(ReservationStayException.class, () -> stays.checkOut(stay)); assertEquals(2, events());
        } finally { start.countDown(); pool.shutdownNow(); assertTrue(pool.awaitTermination(30, TimeUnit.SECONDS)); }
    }

    @Test void checkoutWaitsForCleaningWriterAndPreservesDndFromTheLatestSnapshot() throws Exception {
        cleaning("INSPECTED");
        jdbc.update("UPDATE hk_room_states SET dnd=false WHERE room_id=?", room);
        var loaded = new CountDownLatch(1); var holding = new CountDownLatch(1);
        var attempting = new CountDownLatch(1); var release = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(2);
        try {
            var checkout = pool.submit(() -> new TransactionTemplate(transactions).executeWithoutResult(tx -> {
                assertFalse(states.findByPropertyIdAndRoomId(property, room).orElseThrow().isDnd());
                loaded.countDown(); await(holding); attempting.countDown(); stays.checkOut(stay);
            }));
            var writer = pool.submit(() -> new TransactionTemplate(transactions).executeWithoutResult(tx -> {
                await(loaded); housekeeping.setDnd(property, room, true, null); entities.flush();
                holding.countDown(); await(release);
            }));
            assertTrue(attempting.await(30, TimeUnit.SECONDS));
            assertThrows(TimeoutException.class, () -> checkout.get(250, TimeUnit.MILLISECONDS));
            release.countDown(); writer.get(30, TimeUnit.SECONDS); checkout.get(30, TimeUnit.SECONDS);
            var hk = housekeeping.statusOf(property, room);
            assertEquals("DIRTY", hk.status().name()); assertTrue(hk.dnd()); assertEquals(3, events());
        } finally { release.countDown(); pool.shutdownNow(); assertTrue(pool.awaitTermination(30, TimeUnit.SECONDS)); }
    }
    private static void await(CountDownLatch latch) {
        try { assertTrue(latch.await(30, TimeUnit.SECONDS)); }
        catch (InterruptedException error) { Thread.currentThread().interrupt(); throw new AssertionError(error); }
    }
}
