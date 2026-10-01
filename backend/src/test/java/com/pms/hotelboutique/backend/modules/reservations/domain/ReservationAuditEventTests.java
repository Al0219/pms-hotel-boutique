package com.pms.hotelboutique.backend.modules.reservations.domain;

import java.time.Instant;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

class ReservationAuditEventTests {

    private static final Instant NOW = Instant.parse("2026-09-30T12:00:00Z");

    @Test
    void recordsFullEvent() {
        UUID entity = UUID.randomUUID();
        UUID correlation = UUID.randomUUID();
        var event = new ReservationAuditEvent(UUID.randomUUID(),
                ReservationAuditEvent.ActorType.STAFF, UUID.randomUUID(), "RESERVATION_CONFIRMED",
                "RESERVATION", entity, null, "{\"status\":\"PENDING\"}", "{\"status\":\"CONFIRMED\"}",
                "Guest confirmed at desk", correlation, NOW);

        assertEquals("RESERVATION_CONFIRMED", event.getAction());
        assertEquals(entity, event.getEntityId());
        assertEquals(correlation, event.getCorrelationId());
        assertEquals(NOW, event.getOccurredAt());
    }

    @Test
    void recordsMinimalSystemEvent() {
        var event = new ReservationAuditEvent(UUID.randomUUID(),
                ReservationAuditEvent.ActorType.SYSTEM, null, "NIGHT_AUDIT_ROLL",
                "BUSINESS_DAY", UUID.randomUUID(), null, null, null, null, null, NOW);

        assertNull(event.getActorId());
        assertNull(event.getBeforeState());
    }

    @Test
    void rejectsBlankActionEntityOrMissingIds() {
        assertThrows(IllegalArgumentException.class, () -> new ReservationAuditEvent(UUID.randomUUID(),
                ReservationAuditEvent.ActorType.STAFF, null, "  ", "RESERVATION", UUID.randomUUID(),
                null, null, null, null, null, NOW));
        assertThrows(IllegalArgumentException.class, () -> new ReservationAuditEvent(UUID.randomUUID(),
                ReservationAuditEvent.ActorType.STAFF, null, "CREATED", "  ", UUID.randomUUID(),
                null, null, null, null, null, NOW));
        assertThrows(IllegalArgumentException.class, () -> new ReservationAuditEvent(UUID.randomUUID(),
                null, null, "CREATED", "RESERVATION", UUID.randomUUID(),
                null, null, null, null, null, NOW));
    }
}
