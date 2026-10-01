package com.pms.hotelboutique.backend.modules.operations.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

class BusinessDayTests {

    private static final Instant NOW = Instant.parse("2026-09-30T12:00:00Z");

    @Test
    void opensOpenAndClosesOnce() {
        var day = new BusinessDay(UUID.randomUUID(), UUID.randomUUID(),
                LocalDate.parse("2026-11-01"), NOW);

        assertEquals(BusinessDay.Status.OPEN, day.getStatus());
        day.close(UUID.randomUUID(), NOW.plusSeconds(1));
        assertEquals(BusinessDay.Status.CLOSED, day.getStatus());
        assertThrows(IllegalStateException.class, () -> day.close(UUID.randomUUID(), NOW.plusSeconds(2)));
    }

    @Test
    void runsFinishOnce() {
        var run = new NightAuditRun(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), null, NOW);
        run.complete(NOW.plusSeconds(1));
        assertEquals(NightAuditRun.Status.COMPLETED, run.getStatus());
        assertThrows(IllegalStateException.class, () -> run.complete(NOW.plusSeconds(2)));

        var blocked = new NightAuditRun(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), null,
                NOW);
        blocked.block("1 unreconciled housekeeping discrepancies", NOW.plusSeconds(1));
        assertEquals(NightAuditRun.Status.BLOCKED, blocked.getStatus());
        assertThrows(IllegalArgumentException.class,
                () -> new NightAuditRun(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), null,
                        NOW).block("  ", NOW));
    }
}
