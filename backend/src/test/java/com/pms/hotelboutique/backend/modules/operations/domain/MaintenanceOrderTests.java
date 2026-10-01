package com.pms.hotelboutique.backend.modules.operations.domain;

import java.time.Instant;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

class MaintenanceOrderTests {

    private static final Instant NOW = Instant.parse("2026-09-30T12:00:00Z");

    private static MaintenanceOrder opened() {
        return new MaintenanceOrder(UUID.randomUUID(), UUID.randomUUID(), "Leaking faucet", NOW);
    }

    @Test
    void opensWithMediumPriority() {
        var order = opened();

        assertEquals(MaintenanceOrder.Status.OPEN, order.getStatus());
        assertEquals(MaintenanceOrder.Priority.MEDIUM, order.getPriority());
        assertNull(order.getResolvedAt());
    }

    @Test
    void progressesAndResolves() {
        var order = opened();
        order.startProgress(NOW.plusSeconds(1));
        assertEquals(MaintenanceOrder.Status.IN_PROGRESS, order.getStatus());
        order.resolve(NOW.plusSeconds(2));

        assertEquals(MaintenanceOrder.Status.RESOLVED, order.getStatus());
    }

    @Test
    void resolvesDirectlyFromOpen() {
        var order = opened();
        order.resolve(NOW.plusSeconds(1));

        assertEquals(MaintenanceOrder.Status.RESOLVED, order.getStatus());
    }

    @Test
    void cancelsAndReopensWithGuards() {
        var cancelled = opened();
        cancelled.cancel(NOW.plusSeconds(1));
        assertEquals(MaintenanceOrder.Status.CANCELLED, cancelled.getStatus());
        assertThrows(IllegalStateException.class, () -> cancelled.resolve(NOW.plusSeconds(2)));
        assertThrows(IllegalStateException.class, () -> cancelled.reopen(NOW.plusSeconds(2)));

        var resolved = opened();
        resolved.resolve(NOW.plusSeconds(1));
        resolved.reopen(NOW.plusSeconds(2));
        assertEquals(MaintenanceOrder.Status.OPEN, resolved.getStatus());
        assertNull(resolved.getResolvedAt());
    }

    @Test
    void rejectsBlankTitle() {
        assertThrows(IllegalArgumentException.class,
                () -> new MaintenanceOrder(UUID.randomUUID(), UUID.randomUUID(), "  ", NOW));
    }
}
