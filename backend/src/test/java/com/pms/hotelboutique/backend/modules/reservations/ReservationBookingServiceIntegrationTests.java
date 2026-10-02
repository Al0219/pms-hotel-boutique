package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.BookingView;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.application.CreateBookingCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.CreateGuestProfileCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.GuestProfileService;
import com.pms.hotelboutique.backend.modules.reservations.application.GuestProfileView;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationBookingException;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationBookingService;
import com.pms.hotelboutique.backend.modules.reservations.domain.Reservation;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationStay;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.GuestProfileRepository;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationRepository;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationStayRepository;
import com.pms.hotelboutique.backend.modules.reservations.support.ControllableAvailabilityConfiguration;
import com.pms.hotelboutique.backend.modules.reservations.support.TestConnections;
import jakarta.validation.ConstraintViolationException;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@Import(ControllableAvailabilityConfiguration.class)
class ReservationBookingServiceIntegrationTests {

    /** Seed property from 002-management-001; present in every migrated database. */
    private static final UUID SEED_PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");

    @Autowired
    ReservationBookingService booking;

    @Autowired
    GuestProfileService profiles;

    @Autowired
    ReservationRepository reservations;

    @Autowired
    ReservationStayRepository stays;

    @Autowired
    GuestProfileRepository guestProfiles;

    @Autowired
    AuditService audit;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    javax.sql.DataSource dataSource;

    private UUID roomType;
    private UUID room;
    private UUID soldOutType;

    @BeforeEach
    void fixtures() {
        ControllableAvailabilityConfiguration.reset();
        roomType = UUID.randomUUID();
        room = UUID.randomUUID();
        soldOutType = UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'KING','King')",
                roomType, SEED_PROPERTY);
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,'101')",
                room, SEED_PROPERTY, roomType);
        // Two overlapping stays of the same type sum their demand inside the
        // admission port, so the fixture provides two physical rooms.
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,'102')",
                UUID.randomUUID(), SEED_PROPERTY, roomType);
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'SOLD','Sold out')",
                soldOutType, SEED_PROPERTY);
        ControllableAvailabilityConfiguration.setStock(soldOutType, 0);
    }

    private CreateGuestProfileCommand newProfile(String first, String phone) {
        return new CreateGuestProfileCommand(null, null, first, "Tester", null, phone, null, null, null);
    }

    /** Committed-only row count (separate connection, unaffected by the test transaction). */
    private long committedCount(String table) throws Exception {
        try (var connection = TestConnections.publicConnection(dataSource);
                var statement = connection.prepareStatement("SELECT count(*) FROM " + table);
                var result = statement.executeQuery()) {
            result.next();
            return result.getLong(1);
        }
    }

    @Test
    void createsFullBookingInOneTransaction() {
        GuestProfileView existing = profiles.create(newProfile("Marco", "+502 5555 0403"));
        CreateBookingCommand command = new CreateBookingCommand(SEED_PROPERTY,
                new CreateBookingCommand.BookerBooking(existing.id(), null),
                "GTQ", "RECEPCION", "walk-in", "Late arrival",
                List.of(
                        new CreateBookingCommand.StayBookingCommand(roomType, room,
                                LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-03"),
                                List.of(
                                        new CreateBookingCommand.OccupantBooking(existing.id(), null, true),
                                        new CreateBookingCommand.OccupantBooking(null,
                                                newProfile("Eva", "+502 5555 0404"), false))),
                        new CreateBookingCommand.StayBookingCommand(roomType, null,
                                LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02"),
                                List.of())));

        BookingView booking = this.booking.createBooking(command);

        assertEquals(Reservation.Status.PENDING, booking.reservation().status());
        assertNotNull(booking.reservation().confirmationCode());
        assertEquals(existing.id(), booking.reservation().bookingGuestId());
        assertEquals(2, booking.stays().size());
        assertEquals(ReservationStay.Status.RESERVED, booking.stays().get(0).status());
        assertEquals(2, booking.stays().get(0).occupants().size());
        assertEquals(0, booking.stays().get(1).occupants().size());
        // Booker profile was reused, occupant profile was created inline.
        assertEquals(2, guestProfiles.count());
    }

    @Test
    void rejectsInvalidDataWithNothingPersisted() {
        CreateBookingCommand command = new CreateBookingCommand(SEED_PROPERTY,
                new CreateBookingCommand.BookerBooking(null, newProfile("Ana", "+502 5555 0405")),
                "GTQ", "WEB_DIRECTA", null, null,
                List.of(new CreateBookingCommand.StayBookingCommand(roomType, null,
                        LocalDate.parse("2026-11-03"), LocalDate.parse("2026-11-01"),
                        List.of())));

        assertThrows(ReservationBookingException.class, () -> booking.createBooking(command));
        assertEquals(0, reservations.count());
        assertEquals(0, stays.count());
        assertEquals(0, guestProfiles.count());
    }

    @Test
    void rejectsMissingPayloadWithNothingPersisted() {
        assertThrows(ConstraintViolationException.class,
                () -> booking.createBooking(new CreateBookingCommand(SEED_PROPERTY, null,
                        "GTQ", "WEB_DIRECTA", null, null, List.of())));
    }

    @Test
    void rejectsSoldOutRoomTypeWithNothingPersisted() {
        CreateBookingCommand command = new CreateBookingCommand(SEED_PROPERTY,
                new CreateBookingCommand.BookerBooking(null, newProfile("Ana", "+502 5555 0406")),
                "GTQ", "WEB_DIRECTA", null, null,
                List.of(new CreateBookingCommand.StayBookingCommand(soldOutType, null,
                        LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02"),
                        List.of())));

        var error = assertThrows(ReservationBookingException.class,
                () -> booking.createBooking(command));
        assertTrue(error.getMessage().contains("no availability"));
        assertEquals(0, reservations.count());
        assertEquals(0, stays.count());
        assertEquals(0, guestProfiles.count());
    }

    @Test
    void rollsBackWhenALateOccupantFails() throws Exception {
        UUID unknownProfile = UUID.randomUUID();
        CreateBookingCommand command = new CreateBookingCommand(SEED_PROPERTY,
                new CreateBookingCommand.BookerBooking(null, newProfile("Ana", "+502 5555 0407")),
                "GTQ", "WEB_DIRECTA", null, null,
                List.of(
                        new CreateBookingCommand.StayBookingCommand(roomType, room,
                                LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-03"),
                                List.of(new CreateBookingCommand.OccupantBooking(null,
                                        newProfile("Luis", "+502 5555 0408"), true))),
                        new CreateBookingCommand.StayBookingCommand(roomType, null,
                                LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02"),
                                List.of(new CreateBookingCommand.OccupantBooking(unknownProfile, null, true)))));

        assertThrows(ReservationBookingException.class, () -> booking.createBooking(command));
        // The whole booking (reservation, both stays, both profiles) rolled back:
        // read through a separate connection so only committed rows are visible.
        assertEquals(0, committedCount("reservations"));
        assertEquals(0, committedCount("reservation_stays"));
        assertEquals(0, committedCount("guest_profiles"));
    }

    @Test
    void rejectsAmbiguousBookerAndOccupant() {
        GuestProfileView existing = profiles.create(newProfile("Marco", "+502 5555 0409"));
        assertThrows(ReservationBookingException.class, () -> booking.createBooking(
                new CreateBookingCommand(SEED_PROPERTY,
                        new CreateBookingCommand.BookerBooking(existing.id(), newProfile("Ana", "+502 5555 0410")),
                        "GTQ", "WEB_DIRECTA", null, null,
                        List.of(new CreateBookingCommand.StayBookingCommand(roomType, null,
                                LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02"),
                                List.of(new CreateBookingCommand.OccupantBooking(existing.id(),
                                        newProfile("Eva", "+502 5555 0411"), false)))))));
    }

    @Test
    void recordsCorrelatedAuditTrail() {
        BookingView created = booking.createBooking(new CreateBookingCommand(SEED_PROPERTY,
                new CreateBookingCommand.BookerBooking(null, newProfile("Ana", "+502 5555 0420")),
                "GTQ", "WEB_DIRECTA", null, null,
                List.of(new CreateBookingCommand.StayBookingCommand(roomType, null,
                        LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02"),
                        List.of()))));

        var reservationEvents = audit.findByEntity("RESERVATION", created.reservation().id());
        assertEquals(1, reservationEvents.size());
        var stayEvents = audit.findByEntity("RESERVATION_STAY", created.stays().get(0).id());
        assertEquals(1, stayEvents.size());
        // Both events share the flow correlation id.
        assertNotNull(reservationEvents.get(0).correlationId());
        assertEquals(reservationEvents.get(0).correlationId(), stayEvents.get(0).correlationId());
    }
}
