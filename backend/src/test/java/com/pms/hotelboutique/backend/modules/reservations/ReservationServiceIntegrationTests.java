package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.CreateGuestProfileCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.CreateReservationCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.GuestProfileService;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationException;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationService;
import com.pms.hotelboutique.backend.modules.reservations.domain.Reservation;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationRepository;
import jakarta.validation.ConstraintViolationException;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import javax.sql.DataSource;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ReservationServiceIntegrationTests {

    /** Seed property from 002-management-001; present in every migrated database. */
    private static final UUID SEED_PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");

    @Autowired
    ReservationService service;

    @Autowired
    GuestProfileService profiles;

    @Autowired
    ReservationRepository reservations;

    @Autowired
    DataSource dataSource;

    @Test
    void createsPendingContainerWithGeneratedCode() {
        var view = service.create(new CreateReservationCommand(
                SEED_PROPERTY, null, "GTQ", "WEB_DIRECTA", null, null));

        assertNotNull(view.id());
        assertEquals(Reservation.Status.PENDING, view.status());
        assertNotNull(view.confirmationCode());
        assertEquals(10, view.confirmationCode().length());
        assertNull(view.bookingGuestId());
        assertTrue(reservations.findByConfirmationCode(view.confirmationCode()).isPresent());
    }

    @Test
    void generatesUniqueCodes() {
        Set<String> codes = new HashSet<>();
        for (int i = 0; i < 5; i++) {
            codes.add(service.create(new CreateReservationCommand(
                    SEED_PROPERTY, null, "GTQ", "WEB_DIRECTA", null, null)).confirmationCode());
        }
        assertEquals(5, codes.size());
    }

    @Test
    void linksBookingGuestProfile() {
        var profile = profiles.create(new CreateGuestProfileCommand(
                null, null, "Ana", "Lopez", null, "+502 5555 0201", null, null, null));

        var view = service.create(new CreateReservationCommand(
                SEED_PROPERTY, profile.id(), "GTQ", "RECEPCION", "walk-in", "Late arrival"));

        assertEquals(profile.id(), view.bookingGuestId());
        assertEquals("walk-in", view.sourceReference());
    }

    @Test
    void rejectsUnknownBookingGuest() {
        var command = new CreateReservationCommand(
                SEED_PROPERTY, UUID.randomUUID(), "GTQ", "WEB_DIRECTA", null, null);

        assertThrows(ReservationException.class, () -> service.create(command));
    }

    @Test
    void rejectsUnknownPropertyThroughForeignKey() {
        service.create(new CreateReservationCommand(
                UUID.randomUUID(), null, "GTQ", "WEB_DIRECTA", null, null));

        assertThrows(DataIntegrityViolationException.class, reservations::flush);
    }

    @Test
    void rejectsInvalidInput() {
        assertThrows(ConstraintViolationException.class, () -> service.create(new CreateReservationCommand(
                SEED_PROPERTY, null, "gtq", "WEB_DIRECTA", null, null)));
        assertThrows(ConstraintViolationException.class, () -> service.create(new CreateReservationCommand(
                SEED_PROPERTY, null, "GTQ", "  ", null, null)));
        assertThrows(ConstraintViolationException.class, () -> service.create(new CreateReservationCommand(
                null, null, "GTQ", "WEB_DIRECTA", null, null)));
    }

    @Test
    void confirmsAndCancelsWithGuards() {
        var created = service.create(new CreateReservationCommand(
                SEED_PROPERTY, null, "GTQ", "WEB_DIRECTA", null, null));

        var confirmed = service.confirm(created.id());
        assertEquals(Reservation.Status.CONFIRMED, confirmed.status());
        assertThrows(ReservationException.class, () -> service.confirm(created.id()));

        var cancelled = service.cancel(created.id());
        assertEquals(Reservation.Status.CANCELLED, cancelled.status());
        assertThrows(ReservationException.class, () -> service.cancel(created.id()));
        assertThrows(ReservationException.class, () -> service.confirm(created.id()));
        assertEquals(Reservation.Status.CANCELLED, service.get(created.id()).status());
    }

    @Test
    void reportsMissingReservation() {
        assertThrows(ReservationException.class, () -> service.get(UUID.randomUUID()));
    }

    @Test
    void enforcesSchemaConstraints() throws Exception {
        try (var connection = dataSource.getConnection();
                var statement = connection.prepareStatement(
                        "INSERT INTO reservations(id,property_id,confirmation_code,status,currency,"
                                + "source_channel,created_at,updated_at)"
                                + " VALUES (?,?,?,?,?,?,now(),now())")) {
            // Unknown status.
            statement.setObject(1, UUID.randomUUID());
            statement.setObject(2, SEED_PROPERTY);
            statement.setString(3, "CODE-" + UUID.randomUUID().toString().substring(0, 8));
            statement.setString(4, "CHECKED_IN");
            statement.setString(5, "GTQ");
            statement.setString(6, "WEB_DIRECTA");
            var error = assertThrows(java.sql.SQLException.class, statement::executeUpdate);
            assertEquals("23514", error.getSQLState());

            // Lowercase currency.
            statement.setObject(1, UUID.randomUUID());
            statement.setString(4, "PENDING");
            statement.setString(5, "gtq");
            error = assertThrows(java.sql.SQLException.class, statement::executeUpdate);
            assertEquals("23514", error.getSQLState());
        }
        // Duplicate confirmation code: insert the same code twice on one
        // connection; the second insert must fail, then clean up.
        try (var connection = dataSource.getConnection();
                var statement = connection.prepareStatement(
                        "INSERT INTO reservations(id,property_id,confirmation_code,status,currency,"
                                + "source_channel,created_at,updated_at)"
                                + " VALUES (?,?,'DUPCODE01','PENDING','GTQ','WEB_DIRECTA',now(),now())")) {
            statement.setObject(1, UUID.randomUUID());
            statement.setObject(2, SEED_PROPERTY);
            statement.executeUpdate();
            statement.setObject(1, UUID.randomUUID());
            var error = assertThrows(java.sql.SQLException.class, statement::executeUpdate);
            assertEquals("23505", error.getSQLState());
            try (var cleanup = connection.prepareStatement(
                    "DELETE FROM reservations WHERE confirmation_code='DUPCODE01'")) {
                cleanup.executeUpdate();
            }
        }
    }
}
