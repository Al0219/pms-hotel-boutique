package com.pms.hotelboutique.backend.modules.inventory;

import com.pms.hotelboutique.backend.modules.inventory.application.AvailabilityPort;
import com.pms.hotelboutique.backend.modules.inventory.application.InventoryAdmissionPort;
import com.pms.hotelboutique.backend.modules.inventory.application.InventoryDemand;
import com.pms.hotelboutique.backend.modules.inventory.application.InventoryExhaustedException;
import com.pms.hotelboutique.backend.modules.inventory.application.StayDateRange;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

/** Real ATS/locks/transactions, with BD3 SQL contract fixtures confined to a test schema. */
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class InventoryAdmissionIntegrationTests {
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private static final String SCHEMA = "bd2_admission_" + UUID.randomUUID().toString().replace("-", "");
    private static final LocalDate ARRIVAL = LocalDate.parse("2026-11-01");
    private static final StayDateRange DATES = new StayDateRange(ARRIVAL, ARRIVAL.plusDays(2));

    @DynamicPropertySource
    static void searchPath(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.hikari.connection-init-sql",
                () -> "SET search_path TO " + SCHEMA + ", public");
    }

    @Autowired JdbcTemplate jdbc;
    @Autowired InventoryAdmissionPort admissions;
    @Autowired AvailabilityPort availability;
    @Autowired PlatformTransactionManager transactions;
    private UUID type;
    private UUID actor;

    @BeforeAll
    void contractSchema() {
        jdbc.execute("CREATE SCHEMA " + SCHEMA);
        jdbc.execute("CREATE TABLE " + SCHEMA + ".reservations (id UUID PRIMARY KEY, status VARCHAR(16) NOT NULL)");
        jdbc.execute("CREATE TABLE " + SCHEMA + ".reservation_stays (id UUID PRIMARY KEY, "
                + "reservation_id UUID NOT NULL REFERENCES " + SCHEMA + ".reservations(id), "
                + "property_id UUID NOT NULL, room_type_id UUID NOT NULL, arrival DATE NOT NULL, "
                + "departure DATE NOT NULL, status VARCHAR(16) NOT NULL)");
    }

    @AfterAll
    void dropContractSchema() {
        // SCHEMA is a generated identifier owned exclusively by this test class.
        jdbc.execute("DROP SCHEMA " + SCHEMA + " CASCADE");
    }

    @BeforeEach
    void inventory() {
        type = UUID.randomUUID();
        jdbc.update("INSERT INTO public.room_types(id, property_id, code, name) VALUES (?, ?, ?, 'Admission test')",
                type, PROPERTY, "ADM-" + type);
        addRoom();
    }

    @AfterEach
    void cleanInventory() {
        jdbc.update("DELETE FROM " + SCHEMA + ".reservation_stays WHERE room_type_id = ?", type);
        jdbc.update("DELETE FROM " + SCHEMA + ".reservations r WHERE NOT EXISTS "
                + "(SELECT 1 FROM " + SCHEMA + ".reservation_stays s WHERE s.reservation_id = r.id)");
        jdbc.update("DELETE FROM public.out_of_order_records WHERE property_id = ? "
                + "AND room_id IN (SELECT id FROM public.rooms WHERE room_type_id = ?)", PROPERTY, type);
        jdbc.update("DELETE FROM public.rooms WHERE property_id = ? AND room_type_id = ?", PROPERTY, type);
        jdbc.update("DELETE FROM public.room_types WHERE property_id = ? AND id = ?", PROPERTY, type);
        if (actor != null) {
            jdbc.update("DELETE FROM public.staff_users WHERE id = ?", actor);
            actor = null;
        }
    }

    @Test
    void consumingOneUnitDecreasesATSExactlyOneAndExhaustionDoesNotWrite() {
        assertEquals(1, availability.calculateATS(PROPERTY, type, DATES));
        UUID reservation = admissions.admit(PROPERTY, List.of(demand(DATES)), () -> consume(DATES));
        assertNotNull(reservation);
        assertEquals(0, availability.calculateATS(PROPERTY, type, DATES));
        var called = new AtomicBoolean();
        assertThrows(InventoryExhaustedException.class,
                () -> admissions.admit(PROPERTY, List.of(demand(DATES)), () -> called.getAndSet(true)));
        assertFalse(called.get());
        assertEquals(1, stayCount());
    }

    @Test
    void accumulatesOverlappingStaysBeforeAnyWrite() {
        var called = new AtomicBoolean();
        var lastNight = new StayDateRange(ARRIVAL.plusDays(1), ARRIVAL.plusDays(2));
        assertThrows(InventoryExhaustedException.class, () -> admissions.admit(PROPERTY,
                List.of(demand(DATES), demand(lastNight)), () -> called.getAndSet(true)));
        assertFalse(called.get());
        assertEquals(0, stayCount());
        assertEquals(1, availability.calculateATS(PROPERTY, type, DATES));
    }

    @Test
    void adjacentStaysCanUseTheSameUnitOnDifferentNights() {
        var first = new StayDateRange(ARRIVAL, ARRIVAL.plusDays(1));
        var second = new StayDateRange(ARRIVAL.plusDays(1), ARRIVAL.plusDays(2));
        admissions.admit(PROPERTY, List.of(demand(first), demand(second)), () -> {
            consume(first);
            return consume(second);
        });
        assertEquals(2, stayCount());
        assertEquals(0, availability.calculateATS(PROPERTY, type, DATES));
    }

    @Test
    void failedPersistenceRollsBackConsumptionAndAllowsRetry() {
        assertThrows(IllegalStateException.class, () -> admissions.admit(PROPERTY, List.of(demand(DATES)), () -> {
            consume(DATES);
            throw new IllegalStateException("late persistence failure");
        }));
        assertEquals(0, stayCount());
        assertEquals(1, availability.calculateATS(PROPERTY, type, DATES));
        admissions.admit(PROPERTY, List.of(demand(DATES)), () -> consume(DATES));
        assertEquals(0, availability.calculateATS(PROPERTY, type, DATES));
    }

    @Test
    void cancelledParentReleasesCapacityWithoutDeletingPhysicalRooms() {
        UUID reservation = admissions.admit(PROPERTY, List.of(demand(DATES)), () -> consume(DATES));
        jdbc.update("UPDATE " + SCHEMA + ".reservations SET status = 'CANCELLED' WHERE id = ?", reservation);
        assertEquals(1, availability.calculateATS(PROPERTY, type, DATES));
        assertEquals(1, stayCount());
        assertEquals(1, physicalCount());
    }

    @Test
    void outOfOrderReducesAdmissionButOutOfServiceDoesNot() {
        UUID second = addRoom();
        actor = UUID.randomUUID();
        jdbc.update("INSERT INTO public.staff_users(id, username, work_email, password_hash, role_code, "
                        + "status, created_at, updated_at) VALUES (?, ?, ?, 'test-only', 'OPERACIONES', 'ACTIVE', now(), now())",
                actor, "ADM-" + actor, actor + "@example.invalid");
        UUID first = jdbc.queryForObject("SELECT id FROM public.rooms WHERE room_type_id = ? AND id <> ?",
                UUID.class, type, second);
        outage(first, "OOO");
        outage(second, "OOS");
        assertEquals(1, availability.calculateATS(PROPERTY, type, DATES));
        assertThrows(InventoryExhaustedException.class,
                () -> admissions.admit(PROPERTY, List.of(new InventoryDemand(type, DATES, 2)), () -> consume(DATES)));
        admissions.admit(PROPERTY, List.of(demand(DATES)), () -> consume(DATES));
        assertEquals(0, availability.calculateATS(PROPERTY, type, DATES));
        assertEquals(2, physicalCount());
    }

    @Test
    void validatesDemandScopeAndTransactionBeforePersistence() {
        assertThrows(IllegalArgumentException.class, () -> new InventoryDemand(type, DATES, 0));
        assertThrows(IllegalArgumentException.class,
                () -> admissions.admit(PROPERTY, List.of(), () -> consume(DATES)));
        assertThrows(IllegalArgumentException.class,
                () -> admissions.admit(UUID.randomUUID(), List.of(demand(DATES)), () -> consume(DATES)));
        var readOnly = new TransactionTemplate(transactions);
        readOnly.setReadOnly(true);
        assertThrows(IllegalStateException.class, () -> readOnly.execute(status ->
                admissions.admit(PROPERTY, List.of(demand(DATES)), () -> consume(DATES))));
        var repeatableRead = new TransactionTemplate(transactions);
        repeatableRead.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
        assertThrows(IllegalStateException.class, () -> repeatableRead.execute(status ->
                admissions.admit(PROPERTY, List.of(demand(DATES)), () -> consume(DATES))));
        assertEquals(0, stayCount());
    }

    @Test
    void concurrentAdmissionsHoldTheLockUntilTheOuterTransactionCommits() throws Exception {
        var admitted = new CountDownLatch(1);
        var releaseCommit = new CountDownLatch(1);
        try (var workers = Executors.newFixedThreadPool(2)) {
            var first = workers.submit(() -> new TransactionTemplate(transactions).execute(status -> {
                UUID reservation = admissions.admit(PROPERTY, List.of(demand(DATES)), () -> consume(DATES));
                admitted.countDown();
                await(releaseCommit);
                return reservation;
            }));
            try {
                assertTrue(admitted.await(10, TimeUnit.SECONDS));
                var second = workers.submit(() -> {
                    try {
                        admissions.admit(PROPERTY, List.of(demand(DATES)), () -> consume(DATES));
                        return false;
                    } catch (InventoryExhaustedException expected) {
                        return true;
                    }
                });
                assertTrue(waitForDatabaseLock(), "competing admission must wait on a PostgreSQL lock");
                assertFalse(second.isDone());
                releaseCommit.countDown();
                assertNotNull(first.get(10, TimeUnit.SECONDS));
                assertTrue(second.get(10, TimeUnit.SECONDS));
            } finally {
                releaseCommit.countDown();
            }
        }
        assertEquals(1, stayCount());
        assertEquals(0, availability.calculateATS(PROPERTY, type, DATES));
    }

    private boolean waitForDatabaseLock() throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < deadline) {
            int waiting = jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity "
                    + "WHERE datname = current_database() AND wait_event_type = 'Lock' "
                    + "AND query LIKE 'SELECT id FROM room_types%'", Integer.class);
            if (waiting > 0) {
                return true;
            }
            Thread.sleep(20);
        }
        return false;
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(10, TimeUnit.SECONDS)) {
                throw new IllegalStateException("test synchronization timeout");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }

    private InventoryDemand demand(StayDateRange dates) {
        return new InventoryDemand(type, dates, 1);
    }

    private UUID addRoom() {
        UUID room = UUID.randomUUID();
        jdbc.update("INSERT INTO public.rooms(id, property_id, room_type_id, code) VALUES (?, ?, ?, ?)",
                room, PROPERTY, type, "ADM-" + room);
        return room;
    }

    private UUID consume(StayDateRange dates) {
        UUID reservation = UUID.randomUUID();
        jdbc.update("INSERT INTO " + SCHEMA + ".reservations(id, status) VALUES (?, 'CONFIRMED')", reservation);
        jdbc.update("INSERT INTO " + SCHEMA + ".reservation_stays(id, reservation_id, property_id, room_type_id, "
                + "arrival, departure, status) VALUES (?, ?, ?, ?, ?, ?, 'RESERVED')",
                UUID.randomUUID(), reservation, PROPERTY, type, dates.arrival(), dates.departure());
        return reservation;
    }

    private int stayCount() {
        return jdbc.queryForObject("SELECT count(*) FROM " + SCHEMA + ".reservation_stays WHERE room_type_id = ?",
                Integer.class, type);
    }

    private int physicalCount() {
        return jdbc.queryForObject("SELECT count(*) FROM public.rooms WHERE property_id = ? AND room_type_id = ?",
                Integer.class, PROPERTY, type);
    }

    private void outage(UUID room, String kind) {
        jdbc.update("INSERT INTO public.out_of_order_records(id, property_id, room_id, kind, start_date, end_date, "
                + "reason, created_by) VALUES (?, ?, ?, ?, ?, ?, 'Admission test', ?)",
                UUID.randomUUID(), PROPERTY, room, kind, DATES.arrival(), DATES.departure(), actor);
    }
}
