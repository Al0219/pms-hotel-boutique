package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.operations.application.HousekeepingService;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.HkRoomStateRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationStayException;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationStayService;
import jakarta.persistence.EntityManager;
import java.util.UUID;
import java.util.concurrent.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class RoomReadinessIntegrationTests {
    @Autowired JdbcTemplate jdbc;
    @Autowired ReservationStayService stays;
    @Autowired HousekeepingService housekeeping;
    @Autowired HkRoomStateRepository states;
    @Autowired EntityManager entities;
    @Autowired PlatformTransactionManager transactions;
    private UUID property, room, stay, reservation;

    @BeforeEach void fixtures() {
        property = UUID.randomUUID(); room = UUID.randomUUID(); stay = UUID.randomUUID();
        UUID type = UUID.randomUUID(); reservation = UUID.randomUUID();
        jdbc.update("INSERT INTO properties(id,organization_id,code,name,timezone,currency,status,created_at,updated_at) VALUES (?,'4f63ec16-4b5c-4daf-a9ba-fc4251fb81d1',?,'Readiness QA','America/Guatemala','GTQ','ACTIVE',now(),now())", property, property.toString());
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'QA','QA')", type, property);
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,'101')", room, property, type);
        jdbc.update("INSERT INTO reservations(id,property_id,confirmation_code,status,currency,source_channel,created_at,updated_at) VALUES (?,?,?,'CONFIRMED','GTQ','WEB_DIRECTA',now(),now())", reservation, property, reservation.toString().replace("-", "").substring(0, 10));
        jdbc.update("INSERT INTO reservation_stays(id,reservation_id,property_id,room_type_id,room_id,arrival,departure,status,created_at,updated_at) VALUES (?,?,?,?,?,'2035-01-01','2035-01-03','RESERVED',now(),now())", stay, reservation, property, type, room);
    }
    @AfterEach void cleanCommittedTravelFixtures() {
        if (!org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()) {
            // The concurrency test commits its own synthetic travel fixtures. Other tests
            // assert committed global counts; preserve audit and HK history while isolating it.
            jdbc.update("DELETE FROM reservation_stays WHERE reservation_id=?", reservation);
            jdbc.update("DELETE FROM reservations WHERE id=?", reservation);
        }
    }
    private void cleaning(String status) {
        if (status != null) jdbc.update("INSERT INTO hk_room_states(id,property_id,room_id,status,dnd,created_at,updated_at) VALUES (?,?,?,?,false,now(),now())", UUID.randomUUID(), property, room, status);
    }
    @ParameterizedTest @NullSource @ValueSource(strings = {"DIRTY", "CLEAN"})
    void blocksDeliveryUntilInspectionWithoutChangingAssignmentOrTravelState(String cleaning) {
        cleaning(cleaning);
        assertThrows(ReservationStayException.class, () -> stays.checkIn(stay));
        assertEquals("RESERVED", jdbc.queryForObject("SELECT status FROM reservation_stays WHERE id=?", String.class, stay));
        assertEquals(room, jdbc.queryForObject("SELECT room_id FROM reservation_stays WHERE id=?", UUID.class, stay));
    }
    @Test void requiresAnAssignedRoomEvenIfAnotherRoomIsInspected() {
        cleaning("INSPECTED");
        jdbc.update("UPDATE reservation_stays SET room_id=null WHERE id=?", stay);
        assertThrows(ReservationStayException.class, () -> stays.checkIn(stay));
    }
    @Test void inspectedRoomAllowsCheckInAndDndDoesNotReplaceInspection() {
        cleaning("INSPECTED");
        jdbc.update("UPDATE hk_room_states SET dnd=true WHERE room_id=?", room);
        assertEquals("IN_HOUSE", stays.checkIn(stay).status().name());
        assertEquals("INSPECTED", jdbc.queryForObject("SELECT status FROM hk_room_states WHERE room_id=?", String.class, room));
        assertEquals(true, jdbc.queryForObject("SELECT dnd FROM hk_room_states WHERE room_id=?", Boolean.class, room));
    }
    @Test @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void waitsForCleaningWriterAndRejectsStaleInspectedSnapshot() throws Exception {
        cleaning("INSPECTED");
        var loaded = new CountDownLatch(1); var writerHolding = new CountDownLatch(1); var release = new CountDownLatch(1);
        var attempt = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(2);
        try {
            var delivery = pool.submit(() -> {
                try {
                    new TransactionTemplate(transactions).executeWithoutResult(tx -> {
                        assertEquals("INSPECTED", states.findByPropertyIdAndRoomId(property, room).orElseThrow().getStatus().name());
                        loaded.countDown(); await(writerHolding); attempt.countDown();
                        stays.checkIn(stay);
                    });
                    return true;
                } catch (ReservationStayException expected) { return false; }
            });
            var writer = pool.submit(() -> new TransactionTemplate(transactions).executeWithoutResult(tx -> {
                await(loaded);
                housekeeping.markDirty(property, room, "New cleaning issue", null);
                entities.flush(); writerHolding.countDown(); await(release);
            }));
            assertTrue(attempt.await(20, TimeUnit.SECONDS));
            assertThrows(TimeoutException.class, () -> delivery.get(250, TimeUnit.MILLISECONDS));
            release.countDown(); writer.get(20, TimeUnit.SECONDS);
            assertFalse(delivery.get(20, TimeUnit.SECONDS));
            assertEquals("RESERVED", jdbc.queryForObject("SELECT status FROM reservation_stays WHERE id=?", String.class, stay));
            assertEquals("DIRTY", jdbc.queryForObject("SELECT status FROM hk_room_states WHERE room_id=?", String.class, room));
        } finally { release.countDown(); pool.shutdownNow(); assertTrue(pool.awaitTermination(20, TimeUnit.SECONDS)); }
    }
    private static void await(CountDownLatch latch) {
        try { assertTrue(latch.await(20, TimeUnit.SECONDS)); }
        catch (InterruptedException error) { Thread.currentThread().interrupt(); throw new AssertionError(error); }
    }
}
