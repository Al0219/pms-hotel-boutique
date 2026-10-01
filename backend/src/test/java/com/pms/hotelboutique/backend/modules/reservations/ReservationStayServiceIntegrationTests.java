package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.CreateGuestProfileCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.CreateReservationCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.CreateStayCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.GuestProfileService;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationService;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationStayException;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationStayService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationStay;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationStayRepository;
import jakarta.validation.ConstraintViolationException;
import java.time.LocalDate;
import java.util.UUID;
import javax.sql.DataSource;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ReservationStayServiceIntegrationTests {

    /** Seed property from 002-management-001; present in every migrated database. */
    private static final UUID SEED_PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");

    @Autowired
    ReservationStayService stays;

    @Autowired
    ReservationService reservations;

    @Autowired
    GuestProfileService profiles;

    @Autowired
    ReservationStayRepository stayRepository;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    DataSource dataSource;

    private UUID roomType;
    private UUID room;
    private UUID otherPropertyType;

    @BeforeEach
    void fixtures() {
        roomType = UUID.randomUUID();
        room = UUID.randomUUID();
        otherPropertyType = UUID.randomUUID();
        UUID otherProperty = UUID.randomUUID();
        UUID organization = UUID.randomUUID();
        jdbc.update("INSERT INTO organizations(id,name,code,status,created_at,updated_at)"
                + " VALUES (?,'Test Org',?,'ACTIVE',now(),now())", organization, organization.toString());
        jdbc.update("INSERT INTO properties(id,organization_id,name,code,timezone,currency,status,created_at,updated_at)"
                + " VALUES (?,?,'Other',?,'America/Guatemala','GTQ','ACTIVE',now(),now())",
                otherProperty, organization, otherProperty.toString());
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'KING','King')",
                roomType, SEED_PROPERTY);
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,'101')",
                room, SEED_PROPERTY, roomType);
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'TWIN','Twin')",
                otherPropertyType, otherProperty);
    }

    private UUID newReservation() {
        return reservations.create(new CreateReservationCommand(
                SEED_PROPERTY, null, "GTQ", "WEB_DIRECTA", null, null)).id();
    }

    @Test
    void addsMultipleStaysToOneReservation() {
        UUID reservationId = newReservation();

        var first = stays.addStay(new CreateStayCommand(reservationId, roomType, room,
                LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-03")));
        var second = stays.addStay(new CreateStayCommand(reservationId, roomType, null,
                LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02")));

        assertEquals(ReservationStay.Status.RESERVED, first.status());
        assertEquals(room, first.roomId());
        assertNull(second.roomId());
        assertEquals(2, stays.listByReservation(reservationId).size());
    }

    @Test
    void rejectsUnknownReservationAndInvalidPeriod() {
        assertThrows(ReservationStayException.class, () -> stays.addStay(new CreateStayCommand(
                UUID.randomUUID(), roomType, null,
                LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02"))));
        UUID reservationId = newReservation();
        assertThrows(ReservationStayException.class, () -> stays.addStay(new CreateStayCommand(
                reservationId, roomType, null,
                LocalDate.parse("2026-11-02"), LocalDate.parse("2026-11-02"))));
        assertThrows(ConstraintViolationException.class, () -> stays.addStay(new CreateStayCommand(
                reservationId, null, null,
                LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02"))));
    }

    @Test
    void rejectsUnknownRoomTypeAndCrossPropertyTypeThroughForeignKeys() {
        UUID reservationId = newReservation();
        stays.addStay(new CreateStayCommand(reservationId, UUID.randomUUID(), null,
                LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02")));
        assertThrows(DataIntegrityViolationException.class, stayRepository::flush);
    }

    @Test
    void rejectsCrossPropertyRoomType() {
        UUID reservationId = newReservation();
        // Room type exists but belongs to another property: composite FK rejects it.
        stays.addStay(new CreateStayCommand(reservationId, otherPropertyType, null,
                LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02")));
        assertThrows(DataIntegrityViolationException.class, stayRepository::flush);
    }

    @Test
    void movesThroughTravelLifecycleWithGuards() {
        UUID reservationId = newReservation();
        var stay = stays.addStay(new CreateStayCommand(reservationId, roomType, null,
                LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02")));

        var assigned = stays.assignRoom(stay.id(), room);
        assertEquals(room, assigned.roomId());

        var inHouse = stays.checkIn(stay.id());
        assertEquals(ReservationStay.Status.IN_HOUSE, inHouse.status());
        assertThrows(ReservationStayException.class, () -> stays.checkIn(stay.id()));
        assertThrows(ReservationStayException.class, () -> stays.markNoShow(stay.id()));

        var out = stays.checkOut(stay.id());
        assertEquals(ReservationStay.Status.CHECKED_OUT, out.status());
        assertThrows(ReservationStayException.class, () -> stays.cancelStay(stay.id()));
    }

    @Test
    void cancelsAndMarksNoShow() {
        UUID reservationId = newReservation();
        var toCancel = stays.addStay(new CreateStayCommand(reservationId, roomType, null,
                LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02")));
        assertEquals(ReservationStay.Status.CANCELLED, stays.cancelStay(toCancel.id()).status());

        var toMiss = stays.addStay(new CreateStayCommand(reservationId, roomType, null,
                LocalDate.parse("2026-11-03"), LocalDate.parse("2026-11-04")));
        assertEquals(ReservationStay.Status.NO_SHOW, stays.markNoShow(toMiss.id()).status());
    }

    @Test
    void managesOccupantsPerStay() {
        UUID reservationId = newReservation();
        var stay = stays.addStay(new CreateStayCommand(reservationId, roomType, null,
                LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02")));
        var ana = profiles.create(new CreateGuestProfileCommand(
                null, null, "Ana", "Lopez", null, "+502 5555 0301", null, null, null));
        var luis = profiles.create(new CreateGuestProfileCommand(
                null, null, "Luis", "Paz", null, "+502 5555 0302", null, null, null));

        var withPrimary = stays.addOccupant(stay.id(), ana.id(), true);
        assertEquals(1, withPrimary.occupants().size());
        assertTrue(withPrimary.occupants().get(0).primary());

        var withBoth = stays.addOccupant(stay.id(), luis.id(), false);
        assertEquals(2, withBoth.occupants().size());

        // Same profile twice is rejected.
        assertThrows(ReservationStayException.class,
                () -> stays.addOccupant(stay.id(), ana.id(), false));

        // A second primary is rejected by the partial unique index. The
        // violation surfaces on the occupant query flush inside addOccupant.
        var marco = profiles.create(new CreateGuestProfileCommand(
                null, null, "Marco", "Ruiz", null, "+502 5555 0303", null, null, null));
        assertThrows(DataIntegrityViolationException.class,
                () -> stays.addOccupant(stay.id(), marco.id(), true));
    }

    @Test
    void removesOccupantFromItsOwnStay() {
        UUID reservationId = newReservation();
        var stay = stays.addStay(new CreateStayCommand(reservationId, roomType, null,
                LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02")));
        var ana = profiles.create(new CreateGuestProfileCommand(
                null, null, "Ana", "Lopez", null, "+502 5555 0304", null, null, null));
        var withOccupant = stays.addOccupant(stay.id(), ana.id(), true);
        UUID linkId = withOccupant.occupants().get(0).linkId();

        stays.removeOccupant(stay.id(), linkId);
        assertEquals(0, stays.get(stay.id()).occupants().size());

        assertThrows(ReservationStayException.class,
                () -> stays.removeOccupant(stay.id(), UUID.randomUUID()));
    }

    @Test
    void enforcesStayConstraintsOnSchemaLevel() throws Exception {
        // Dedicated transaction with savepoints (mirrors the BD2 schema tests):
        // fixtures and negative inserts roll back together, leaving no residue.
        try (var connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                UUID type = UUID.randomUUID();
                UUID reservationId = UUID.randomUUID();
                try (var fixture = connection.prepareStatement(
                        "INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'SUITE','Suite')")) {
                    fixture.setObject(1, type);
                    fixture.setObject(2, SEED_PROPERTY);
                    fixture.executeUpdate();
                }
                try (var fixture = connection.prepareStatement(
                        "INSERT INTO reservations(id,property_id,confirmation_code,status,currency,"
                                + "source_channel,created_at,updated_at)"
                                + " VALUES (?,?,'SCHEMA01','PENDING','GTQ','WEB_DIRECTA',now(),now())")) {
                    fixture.setObject(1, reservationId);
                    fixture.setObject(2, SEED_PROPERTY);
                    fixture.executeUpdate();
                }
                // Empty period.
                rejected(connection, "23514",
                        "INSERT INTO reservation_stays(id,reservation_id,property_id,room_type_id,"
                                + "arrival,departure,status,created_at,updated_at)"
                                + " VALUES (?,?,?,?,?,?,?,now(),now())",
                        UUID.randomUUID(), reservationId, SEED_PROPERTY, type,
                        java.sql.Date.valueOf("2026-11-02"), java.sql.Date.valueOf("2026-11-02"),
                        "RESERVED");
                // Unknown status.
                rejected(connection, "23514",
                        "INSERT INTO reservation_stays(id,reservation_id,property_id,room_type_id,"
                                + "arrival,departure,status,created_at,updated_at)"
                                + " VALUES (?,?,?,?,?,?,?,now(),now())",
                        UUID.randomUUID(), reservationId, SEED_PROPERTY, type,
                        java.sql.Date.valueOf("2026-11-02"), java.sql.Date.valueOf("2026-11-03"),
                        "SLEEPING");
            } finally {
                connection.rollback();
            }
        }
    }

    private void rejected(java.sql.Connection connection, String state, String sql, Object... values)
            throws java.sql.SQLException {
        var savepoint = connection.setSavepoint();
        try {
            try (var statement = connection.prepareStatement(sql)) {
                for (int i = 0; i < values.length; i++) {
                    statement.setObject(i + 1, values[i]);
                }
                var error = org.junit.jupiter.api.Assertions.assertThrows(
                        java.sql.SQLException.class, statement::executeUpdate);
                org.junit.jupiter.api.Assertions.assertEquals(state, error.getSQLState());
            }
        } finally {
            connection.rollback(savepoint);
            connection.releaseSavepoint(savepoint);
        }
    }

    @Test
    void reportsMissingStay() {
        assertThrows(ReservationStayException.class, () -> stays.get(UUID.randomUUID()));
        assertNotNull(stays.listByReservation(UUID.randomUUID()));
    }
}
