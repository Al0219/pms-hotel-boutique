package com.pms.hotelboutique.backend.modules.reservations;

import com.pms.hotelboutique.backend.modules.reservations.application.BookingView;
import com.pms.hotelboutique.backend.modules.reservations.application.CreateBookingCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.CreateGuestProfileCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationBookingService;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/**
 * Proves the booking flows against the real ATS engine (BD2 Fase 3+): one
 * physical room yields ATS 1 and the precheck passes. No stub is imported
 * here on purpose, so this context exercises the production wiring.
 *
 * <p>History: this suite once locked a fail-open behavior when no ATS engine
 * was wired. Since BD2 now provides its engine, booking with zero physical
 * rooms is correctly rejected; the fail-open path only applies when no
 * {@code AvailabilityPort} bean exists at all.</p>
 */
@SpringBootTest
@Transactional
class ReservationBookingWithoutAvailabilityTests {

    private static final UUID SEED_PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");

    @Autowired
    ReservationBookingService booking;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void booksAgainstRealAvailabilityEngine() {
        UUID roomType = UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id,property_id,code,name) VALUES (?,?,'KING','King')",
                roomType, SEED_PROPERTY);
        jdbc.update("INSERT INTO rooms(id,property_id,room_type_id,code) VALUES (?,?,?,'101')",
                UUID.randomUUID(), SEED_PROPERTY, roomType);

        BookingView booking = this.booking.createBooking(new CreateBookingCommand(SEED_PROPERTY,
                new CreateBookingCommand.BookerBooking(null, new CreateGuestProfileCommand(
                        null, null, "Ana", "Lopez", null, "+502 5555 0501", null, null, null)),
                "GTQ", "WEB_DIRECTA", null, null,
                List.of(new CreateBookingCommand.StayBookingCommand(roomType, null,
                        LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02"),
                        List.of()))));

        assertEquals(1, booking.stays().size());
    }
}
