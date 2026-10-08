package com.pms.hotelboutique.backend.modules.reservations.domain;

import java.time.Instant;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

class FolioTests {

    private static final Instant NOW = Instant.parse("2026-09-30T12:00:00Z");
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");

    @Test
    void opensOpenAndMovesThroughLifecycle() {
        var folio = new Folio(UUID.randomUUID(), PROPERTY, Folio.Type.GUEST, "GTQ", NOW);

        assertEquals(Folio.Status.OPEN, folio.getStatus());
        assertTrue(folio.acceptsPostings());

        folio.settle(NOW.plusSeconds(1));
        assertEquals(Folio.Status.SETTLED, folio.getStatus());
        assertFalse(folio.acceptsPostings());

        folio.reopen(NOW.plusSeconds(2));
        assertEquals(Folio.Status.OPEN, folio.getStatus());

        folio.settle(NOW.plusSeconds(3));
        folio.close(NOW.plusSeconds(4));
        assertEquals(Folio.Status.CLOSED, folio.getStatus());
        assertFalse(folio.acceptsPostings());
    }

    @Test
    void rejectsInvalidTransitions() {
        var folio = new Folio(UUID.randomUUID(), PROPERTY, Folio.Type.GUEST, "GTQ", NOW);

        assertThrows(IllegalStateException.class, () -> folio.close(NOW));
        assertThrows(IllegalStateException.class, () -> folio.reopen(NOW));

        folio.settle(NOW.plusSeconds(1));
        assertThrows(IllegalStateException.class, () -> folio.settle(NOW.plusSeconds(2)));
    }

    @Test
    void rejectsInvalidHeader() {
        assertThrows(IllegalArgumentException.class,
                () -> new Folio(UUID.randomUUID(), PROPERTY, Folio.Type.GUEST, "gtq", NOW));
        assertThrows(IllegalArgumentException.class,
                () -> new Folio(UUID.randomUUID(), null, Folio.Type.GUEST, "GTQ", NOW));
    }
}
