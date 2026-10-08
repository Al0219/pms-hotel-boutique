package com.pms.hotelboutique.backend.modules.reservations.domain;

import java.time.Instant;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

class ReservationTests {

    private static final Instant NOW = Instant.parse("2026-09-30T12:00:00Z");
    private static final UUID PROPERTY = UUID.randomUUID();

    private static Reservation pending() {
        return new Reservation(UUID.randomUUID(), PROPERTY, "ABC123XYZ9", "GTQ", "WEB_DIRECTA", NOW);
    }

    @Test
    void opensPendingContainer() {
        var reservation = pending();

        assertEquals(Reservation.Status.PENDING, reservation.getStatus());
        assertEquals("ABC123XYZ9", reservation.getConfirmationCode());
        assertEquals("GTQ", reservation.getCurrency());
    }

    @Test
    void rejectsInvalidContainerData() {
        assertThrows(IllegalArgumentException.class,
                () -> new Reservation(UUID.randomUUID(), PROPERTY, "  ", "GTQ", "WEB", NOW));
        assertThrows(IllegalArgumentException.class,
                () -> new Reservation(UUID.randomUUID(), PROPERTY, "CODE1", "gtq", "WEB", NOW));
        assertThrows(IllegalArgumentException.class,
                () -> new Reservation(UUID.randomUUID(), null, "CODE1", "GTQ", "WEB", NOW));
        assertThrows(IllegalArgumentException.class,
                () -> new Reservation(UUID.randomUUID(), PROPERTY, "CODE1", "GTQ", "  ", NOW));
    }

    @Test
    void confirmsOnlyFromPending() {
        var reservation = pending();
        reservation.confirm(NOW.plusSeconds(5));

        assertEquals(Reservation.Status.CONFIRMED, reservation.getStatus());
        assertThrows(IllegalStateException.class, () -> reservation.confirm(NOW.plusSeconds(6)));
    }

    @Test
    void cancelsFromPendingOrConfirmedButNeverTwice() {
        var fromPending = pending();
        fromPending.cancel(NOW.plusSeconds(5));
        assertEquals(Reservation.Status.CANCELLED, fromPending.getStatus());
        assertThrows(IllegalStateException.class, () -> fromPending.cancel(NOW.plusSeconds(6)));

        var fromConfirmed = pending();
        fromConfirmed.confirm(NOW.plusSeconds(5));
        fromConfirmed.cancel(NOW.plusSeconds(6));
        assertEquals(Reservation.Status.CANCELLED, fromConfirmed.getStatus());

        var cancelled = pending();
        cancelled.cancel(NOW.plusSeconds(5));
        assertThrows(IllegalStateException.class, () -> cancelled.confirm(NOW.plusSeconds(6)));
    }

    @Test
    void linksBookingGuestWithoutMergingProfiles() {
        var reservation = pending();
        var profile = new GuestProfile(UUID.randomUUID(), "Ana", "Lopez", NOW);

        reservation.linkBookingGuest(profile);

        assertEquals(profile.getId(), reservation.getBookingGuest().getId());
    }
}
