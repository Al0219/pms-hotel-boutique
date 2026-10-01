package com.pms.hotelboutique.backend.modules.operations.domain;

import java.time.Instant;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

class ServiceRequestTests {

    private static final Instant NOW = Instant.parse("2026-09-30T12:00:00Z");

    private static ServiceRequest opened() {
        return new ServiceRequest(UUID.randomUUID(), UUID.randomUUID(),
                ServiceRequest.Category.VALET, "Car pickup", NOW);
    }

    @Test
    void opensWithDefaults() {
        var request = opened();

        assertEquals(ServiceRequest.Status.OPEN, request.getStatus());
        assertEquals(ServiceRequest.Priority.MEDIUM, request.getPriority());
        assertNull(request.getCompletedAt());
    }

    @Test
    void worksCompletesAndReopens() {
        var request = opened();
        request.startProgress(NOW.plusSeconds(1));
        assertEquals(ServiceRequest.Status.IN_PROGRESS, request.getStatus());
        request.complete(NOW.plusSeconds(2));
        assertEquals(ServiceRequest.Status.DONE, request.getStatus());

        request.reopen(NOW.plusSeconds(3));
        assertEquals(ServiceRequest.Status.OPEN, request.getStatus());
        assertNull(request.getCompletedAt());
    }

    @Test
    void guardsTerminalStates() {
        var done = opened();
        done.complete(NOW.plusSeconds(1));
        assertThrows(IllegalStateException.class, () -> done.complete(NOW.plusSeconds(2)));
        assertThrows(IllegalStateException.class, () -> done.cancel(NOW.plusSeconds(2)));

        var cancelled = opened();
        cancelled.cancel(NOW.plusSeconds(1));
        assertThrows(IllegalStateException.class, () -> cancelled.reopen(NOW.plusSeconds(2)));
    }

    @Test
    void stayContextRequiresReservation() {
        var request = opened();
        assertThrows(IllegalArgumentException.class,
                () -> request.linkContext(null, UUID.randomUUID(), null, null));
        UUID reservationId = UUID.randomUUID();
        UUID stayId = UUID.randomUUID();
        request.linkContext(reservationId, stayId, null, null);
        assertEquals(reservationId, request.getReservationId());
        assertEquals(stayId, request.getStayId());
    }

    @Test
    void rejectsBlankSubject() {
        assertThrows(IllegalArgumentException.class, () -> new ServiceRequest(UUID.randomUUID(),
                UUID.randomUUID(), ServiceRequest.Category.CONCIERGE, "  ", NOW));
    }
}
