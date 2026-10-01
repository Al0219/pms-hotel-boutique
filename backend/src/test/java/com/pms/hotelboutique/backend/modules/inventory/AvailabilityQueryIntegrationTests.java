package com.pms.hotelboutique.backend.modules.inventory;

import com.pms.hotelboutique.backend.modules.inventory.application.AvailabilityPort;
import com.pms.hotelboutique.backend.modules.inventory.application.StayDateRange;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@Transactional
class AvailabilityQueryIntegrationTests {
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");

    @Autowired JdbcTemplate jdbc;
    @Autowired AvailabilityPort availability;

    @Test
    void countsOnlyInventoryConsumingStaysAndIgnoresCancelledParent() {
        UUID type = UUID.randomUUID();
        jdbc.update("INSERT INTO room_types(id, property_id, code, name) VALUES (?, ?, ?, ?)",
                type, PROPERTY, "ATS-" + type, "ATS test");
        for (int i = 0; i < 4; i++) {
            jdbc.update("INSERT INTO rooms(id, property_id, room_type_id, code) VALUES (?, ?, ?, ?)",
                    UUID.randomUUID(), PROPERTY, type, "ATS-ROOM-" + type + "-" + i);
        }

        jdbc.execute("CREATE TEMP TABLE reservations (id UUID PRIMARY KEY, status VARCHAR(16)) ON COMMIT DROP");
        jdbc.execute("CREATE TEMP TABLE reservation_stays (id UUID PRIMARY KEY, reservation_id UUID, "
                + "property_id UUID, room_type_id UUID, arrival DATE, departure DATE, status VARCHAR(16)) ON COMMIT DROP");
        UUID pending = insertReservation("PENDING");
        UUID confirmed = insertReservation("CONFIRMED");
        UUID cancelledParent = insertReservation("CANCELLED");
        UUID cancelledStayParent = insertReservation("CONFIRMED");
        UUID noShowParent = insertReservation("CONFIRMED");
        UUID checkedOutParent = insertReservation("CONFIRMED");
        insertStay(pending, type, "RESERVED", "2026-11-01", "2026-11-03");
        insertStay(confirmed, type, "IN_HOUSE", "2026-11-02", "2026-11-03");
        insertStay(cancelledParent, type, "RESERVED", "2026-11-01", "2026-11-03");
        insertStay(cancelledStayParent, type, "CANCELLED", "2026-11-01", "2026-11-03");
        insertStay(noShowParent, type, "NO_SHOW", "2026-11-01", "2026-11-03");
        insertStay(checkedOutParent, type, "CHECKED_OUT", "2026-11-01", "2026-11-03");

        assertEquals(3, availability.calculateATS(PROPERTY, type,
                new StayDateRange(LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02"))));
        assertEquals(2, availability.calculateATS(PROPERTY, type,
                new StayDateRange(LocalDate.parse("2026-11-02"), LocalDate.parse("2026-11-03"))));
    }

    private UUID insertReservation(String status) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO reservations(id, status) VALUES (?, ?)", id, status);
        return id;
    }

    private void insertStay(UUID reservationId, UUID typeId, String status,
            String arrival, String departure) {
        jdbc.update("INSERT INTO reservation_stays(id, reservation_id, property_id, room_type_id, "
                        + "arrival, departure, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
                UUID.randomUUID(), reservationId, PROPERTY, typeId,
                LocalDate.parse(arrival), LocalDate.parse(departure), status);
    }
}
