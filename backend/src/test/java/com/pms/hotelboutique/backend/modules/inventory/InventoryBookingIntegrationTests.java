package com.pms.hotelboutique.backend.modules.inventory;

import com.pms.hotelboutique.backend.modules.inventory.application.AvailabilityService;
import com.pms.hotelboutique.backend.modules.inventory.application.InventoryExhaustedException;
import com.pms.hotelboutique.backend.modules.inventory.application.StayDateRange;
import com.pms.hotelboutique.backend.modules.reservations.application.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

/** Actual BD3 booking + BD2 admission, with the entire production changelog in an isolated schema. */
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class InventoryBookingIntegrationTests {
    private static final String SCHEMA = "bd2_booking_" + UUID.randomUUID().toString().replace("-", "");
    private static final UUID ORGANIZATION = UUID.fromString("4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1");
    private static final LocalDate ARRIVAL = LocalDate.of(2035, 1, 1);
    private static final StayDateRange DATES = new StayDateRange(ARRIVAL, ARRIVAL.plusDays(2));

    @DynamicPropertySource
    static void isolatedProductionSchema(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.hikari.connection-init-sql",
                () -> "CREATE SCHEMA IF NOT EXISTS " + SCHEMA + "; SET search_path TO " + SCHEMA);
        properties.add("spring.liquibase.default-schema", () -> SCHEMA);
        properties.add("spring.liquibase.liquibase-schema", () -> SCHEMA);
        properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
    }

    @Autowired ReservationBookingService booking;
    @Autowired ReservationService reservations;
    @Autowired AvailabilityService availability;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;
    private UUID property;
    private UUID type;
    private UUID room;

    @BeforeEach
    void onePhysicalRoom() {
        assertEquals(SCHEMA, jdbc.queryForObject("SELECT current_schema()", String.class));
        property = UUID.randomUUID();
        type = UUID.randomUUID();
        room = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) "
                + "VALUES (?,?,?,'Booking integration','America/Guatemala','GTQ','ACTIVE',now(),now())", property, ORGANIZATION, "P-" + property);
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'KING','King')", type, property);
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,'101')", room, property, type);
    }

    @AfterAll
    void dropOwnedSchema() {
        // Only this suite's generated schema; append-only business history is never deleted selectively.
        jdbc.execute("DROP SCHEMA " + SCHEMA + " CASCADE");
    }

    @Test
    void bookingDecreasesATSExactlyOneAndCancelledParentReleasesIt() {
        assertEquals(1, ats());
        var created = booking.createBooking(command(List.of(stay(DATES))));
        assertEquals(1, created.stays().size());
        assertEquals(0, ats());
        var before = persistedCounts();
        assertThrows(ReservationBookingException.class, () -> booking.createBooking(command(List.of(stay(DATES)))));
        assertEquals(before, persistedCounts());
        reservations.cancel(created.reservation().id());
        assertEquals(1, ats());
        assertEquals("RESERVED", jdbc.queryForObject("SELECT status FROM reservation_stays WHERE id=?", String.class, created.stays().getFirst().id()));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM rooms WHERE property_id=?", Integer.class, property));
    }

    @Test
    void summedOverlappingDemandIsRejectedBeforeProfilesStaysOrAuditAreWritten() {
        var overlap = new StayDateRange(ARRIVAL.plusDays(1), DATES.departure());
        var before = persistedCounts();
        var error = assertThrows(ReservationBookingException.class,
                () -> booking.createBooking(command(List.of(stay(DATES), stay(overlap)))));
        assertInstanceOf(InventoryExhaustedException.class, error.getCause());
        assertEquals(before, persistedCounts());
        assertEquals(1, ats());
    }

    @Test
    void adjacentStaysShareOneRoomOnDifferentNights() {
        var first = new StayDateRange(ARRIVAL, ARRIVAL.plusDays(1));
        var second = new StayDateRange(ARRIVAL.plusDays(1), DATES.departure());
        var created = booking.createBooking(command(List.of(stay(first), stay(second))));
        assertEquals(2, created.stays().size());
        assertEquals(0, ats());
        assertEquals(2, count("reservation_stays"));
        assertEquals(1, count("rooms"));
    }

    @Test
    void lateOccupantFailureRollsBackBookingProfileAuditAndCapacity() {
        var badStay = new CreateBookingCommand.StayBookingCommand(type, null, DATES.arrival(), DATES.departure(),
                List.of(new CreateBookingCommand.OccupantBooking(UUID.randomUUID(), null, true)));
        var before = persistedCounts();
        assertThrows(ReservationBookingException.class, () -> booking.createBooking(command(List.of(badStay))));
        assertEquals(before, persistedCounts());
        assertEquals(1, ats());
        assertNotNull(booking.createBooking(command(List.of(stay(DATES)))));
        assertEquals(0, ats());
    }

    @Test
    void outOfOrderSubtractsCapacityWhileOutOfServicePreservesPhysicalRoom() {
        UUID second = UUID.randomUUID();
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,'102')", second, property, type);
        UUID actor = UUID.randomUUID();
        jdbc.update("INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) "
                + "VALUES (?,?,?,'unused-test-hash','SUPER_ADMIN','ACTIVE',now(),now())", actor, "bd2-" + actor, actor + "@example.test");
        outage(room, "OOO", actor);
        outage(second, "OOS", actor);
        assertEquals(1, ats());
        var error = assertThrows(ReservationBookingException.class,
                () -> booking.createBooking(command(List.of(stay(DATES), stay(DATES)))));
        assertInstanceOf(InventoryExhaustedException.class, error.getCause());
        assertNotNull(booking.createBooking(command(List.of(stay(DATES)))));
        assertEquals(0, ats());
        assertEquals(2, count("rooms"));
        assertEquals(2, count("out_of_order_records"));
    }

    @Test
    void concurrentBookingsSerializeUntilOuterCommitAndOnlyOneCanConsumeLastRoom() throws Exception {
        var persisted = new CountDownLatch(1);
        var releaseCommit = new CountDownLatch(1);
        var waitingPid = new AtomicInteger();
        try (var workers = Executors.newFixedThreadPool(2)) {
            var first = workers.submit(() -> new TransactionTemplate(transactions).execute(status -> {
                var result = booking.createBooking(command(List.of(stay(DATES))));
                persisted.countDown();
                await(releaseCommit);
                return result;
            }));
            try {
                assertTrue(persisted.await(20, TimeUnit.SECONDS));
                // Uncommitted first booking is still invisible to the other transaction's precheck.
                assertEquals(1, ats());
                var second = workers.submit(() -> new TransactionTemplate(transactions).execute(status -> {
                    waitingPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                    return booking.createBooking(command(List.of(stay(DATES))));
                }));
                assertTrue(waitForLock(waitingPid), "Second real booking must wait for the room-type lock");
                assertFalse(second.isDone());
                releaseCommit.countDown();
                assertNotNull(first.get(20, TimeUnit.SECONDS));
                var failure = assertThrows(ExecutionException.class, () -> second.get(20, TimeUnit.SECONDS));
                var rejected = assertInstanceOf(ReservationBookingException.class, failure.getCause());
                assertInstanceOf(InventoryExhaustedException.class, rejected.getCause());
            } finally {
                releaseCommit.countDown();
            }
        }
        assertEquals(0, ats());
        assertEquals(Map.of("reservations", 1, "reservation_stays", 1, "guest_profiles", 1, "reservation_audit_events", 2), persistedCounts());
    }

    private boolean waitForLock(AtomicInteger pid) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        while (System.nanoTime() < deadline) {
            if (pid.get() != 0 && Boolean.TRUE.equals(jdbc.queryForObject(
                    "SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE pid=? AND wait_event_type='Lock')", Boolean.class, pid.get()))) {
                return true;
            }
            Thread.sleep(20);
        }
        return false;
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(30, TimeUnit.SECONDS)) { throw new IllegalStateException("Test synchronization timeout"); }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }

    private CreateBookingCommand command(List<CreateBookingCommand.StayBookingCommand> stays) {
        return new CreateBookingCommand(property, new CreateBookingCommand.BookerBooking(null,
                new CreateGuestProfileCommand(null, property, "Booking", "Integration", null, null, null, null, null)),
                "GTQ", "BD2_TEST", null, null, stays);
    }

    private CreateBookingCommand.StayBookingCommand stay(StayDateRange dates) {
        return new CreateBookingCommand.StayBookingCommand(type, null, dates.arrival(), dates.departure(), List.of());
    }

    private void outage(UUID id, String kind, UUID actor) {
        jdbc.update("INSERT INTO out_of_order_records(id,property_id,room_id,kind,start_date,end_date,reason,created_by) "
                + "VALUES (?,?,?,?,?,?,'Integration test',?)", UUID.randomUUID(), property, id, kind, DATES.arrival(), DATES.departure(), actor);
    }

    private int ats() { return availability.calculateATS(property, type, DATES); }
    private int count(String table) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE property_id=?", Integer.class, property);
    }
    private Map<String, Integer> persistedCounts() {
        return Map.of("reservations", count("reservations"), "reservation_stays", count("reservation_stays"),
                "guest_profiles", count("guest_profiles"), "reservation_audit_events", count("reservation_audit_events"));
    }
}
