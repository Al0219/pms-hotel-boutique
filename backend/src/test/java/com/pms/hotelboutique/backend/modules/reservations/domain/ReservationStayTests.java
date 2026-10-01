package com.pms.hotelboutique.backend.modules.reservations.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

class ReservationStayTests {

    private static final Instant NOW = Instant.parse("2026-09-30T12:00:00Z");
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");

    private static Reservation reservation() {
        return new Reservation(UUID.randomUUID(), PROPERTY, "CODE123456", "GTQ", "WEB_DIRECTA", NOW);
    }

    private static ReservationStay stay() {
        return new ReservationStay(UUID.randomUUID(), reservation(), PROPERTY, UUID.randomUUID(),
                LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-04"), NOW);
    }

    @Test
    void opensReservedWithoutRoom() {
        var stay = stay();

        assertEquals(ReservationStay.Status.RESERVED, stay.getStatus());
        assertNull(stay.getRoomId());
    }

    @Test
    void rejectsInvalidPeriod() {
        var reservation = reservation();
        assertThrows(IllegalArgumentException.class, () -> new ReservationStay(UUID.randomUUID(),
                reservation, PROPERTY, UUID.randomUUID(),
                LocalDate.parse("2026-11-04"), LocalDate.parse("2026-11-04"), NOW));
        assertThrows(IllegalArgumentException.class, () -> new ReservationStay(UUID.randomUUID(),
                reservation, PROPERTY, UUID.randomUUID(),
                LocalDate.parse("2026-11-05"), LocalDate.parse("2026-11-04"), NOW));
    }

    @Test
    void followsTravelLifecycle() {
        var stay = stay();
        stay.assignRoom(UUID.randomUUID(), NOW.plusSeconds(1));
        stay.checkIn(NOW.plusSeconds(2));
        assertEquals(ReservationStay.Status.IN_HOUSE, stay.getStatus());
        stay.checkOut(NOW.plusSeconds(3));
        assertEquals(ReservationStay.Status.CHECKED_OUT, stay.getStatus());

        assertThrows(IllegalStateException.class, () -> stay.cancel(NOW.plusSeconds(4)));
        assertThrows(IllegalStateException.class, () -> stay.assignRoom(UUID.randomUUID(), NOW.plusSeconds(4)));
    }

    @Test
    void cancelsAndMarksNoShowFromReserved() {
        var cancelled = stay();
        cancelled.cancel(NOW.plusSeconds(1));
        assertEquals(ReservationStay.Status.CANCELLED, cancelled.getStatus());
        assertThrows(IllegalStateException.class, () -> cancelled.checkIn(NOW.plusSeconds(2)));

        var noShow = stay();
        noShow.markNoShow(NOW.plusSeconds(1));
        assertEquals(ReservationStay.Status.NO_SHOW, noShow.getStatus());
        assertThrows(IllegalStateException.class, () -> noShow.checkIn(NOW.plusSeconds(2)));
        assertThrows(IllegalStateException.class, () -> noShow.markNoShow(NOW.plusSeconds(2)));
    }

    @Test
    void linksOccupantToProfile() {
        var stay = stay();
        var profile = new GuestProfile(UUID.randomUUID(), "Ana", "Lopez", NOW);

        var link = new ReservationGuest(UUID.randomUUID(), stay, profile, true, NOW);

        assertEquals(stay.getId(), link.getStay().getId());
        assertEquals(profile.getId(), link.getProfile().getId());
    }
}
