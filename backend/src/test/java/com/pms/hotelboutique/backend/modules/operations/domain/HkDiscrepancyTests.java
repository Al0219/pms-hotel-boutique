package com.pms.hotelboutique.backend.modules.operations.domain;

import java.time.Instant;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

class HkDiscrepancyTests {

    private static final Instant NOW = Instant.parse("2026-09-30T12:00:00Z");

    private static HkDiscrepancy reported() {
        return new HkDiscrepancy(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                HkDiscrepancy.FoStatus.OCCUPIED, HkDiscrepancy.HkStatus.CLEAN, NOW);
    }

    @Test
    void investigatesAndReconciles() {
        var discrepancy = reported();
        discrepancy.investigate(NOW.plusSeconds(1));
        assertEquals(HkDiscrepancy.Status.INVESTIGATING, discrepancy.getStatus());
        discrepancy.reconcile("Guest checked out late, room soiled", UUID.randomUUID(),
                NOW.plusSeconds(2));

        assertEquals(HkDiscrepancy.Status.RECONCILED, discrepancy.getStatus());
        assertNotNull(discrepancy.getResolvedAt());
    }

    @Test
    void guardsSkipReconciliation() {
        var discrepancy = reported();
        assertThrows(IllegalStateException.class,
                () -> discrepancy.reconcile("Reason", UUID.randomUUID(), NOW));
        assertThrows(IllegalArgumentException.class,
                () -> { discrepancy.investigate(NOW); discrepancy.reconcile("  ", null, NOW); });
    }

    @Test
    void cancelsFromOpenOrInvestigating() {
        var fromOpen = reported();
        fromOpen.cancel(NOW.plusSeconds(1));
        assertEquals(HkDiscrepancy.Status.CANCELLED, fromOpen.getStatus());

        var reconciled = reported();
        reconciled.investigate(NOW.plusSeconds(1));
        reconciled.reconcile("Ok", null, NOW.plusSeconds(2));
        assertThrows(IllegalStateException.class, () -> reconciled.cancel(NOW.plusSeconds(3)));
    }
}
