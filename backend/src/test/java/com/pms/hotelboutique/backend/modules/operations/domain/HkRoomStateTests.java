package com.pms.hotelboutique.backend.modules.operations.domain;

import java.time.Instant;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

class HkRoomStateTests {

    private static final Instant NOW = Instant.parse("2026-09-30T12:00:00Z");

    private static HkRoomState tracked() {
        return new HkRoomState(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), NOW);
    }

    @Test
    void startsDirtyWithoutDnd() {
        var state = tracked();

        assertEquals(HkRoomState.Status.DIRTY, state.getStatus());
        assertFalse(state.isDnd());
    }

    @Test
    void followsCleaningLifecycle() {
        var state = tracked();
        state.markClean(NOW.plusSeconds(1));
        assertEquals(HkRoomState.Status.CLEAN, state.getStatus());
        state.inspect(NOW.plusSeconds(2));
        assertEquals(HkRoomState.Status.INSPECTED, state.getStatus());
    }

    @Test
    void rejectsOutOfOrderTransitions() {
        var state = tracked();
        assertThrows(IllegalStateException.class, () -> state.inspect(NOW));
        assertThrows(IllegalStateException.class, () -> state.rejectInspection(NOW));

        state.markClean(NOW.plusSeconds(1));
        assertThrows(IllegalStateException.class, () -> state.markClean(NOW.plusSeconds(2)));
        assertThrows(IllegalStateException.class, () -> state.rejectInspection(NOW.plusSeconds(2)));
    }

    @Test
    void rejectedInspectionSoilsAgain() {
        var state = tracked();
        state.markClean(NOW.plusSeconds(1));
        state.inspect(NOW.plusSeconds(2));
        state.rejectInspection(NOW.plusSeconds(3));

        assertEquals(HkRoomState.Status.DIRTY, state.getStatus());
    }

    @Test
    void dndIsAnOverlayNotALifecycle() {
        var state = tracked();
        state.setDnd(true, NOW.plusSeconds(1));

        assertTrue(state.isDnd());
        assertEquals(HkRoomState.Status.DIRTY, state.getStatus());

        state.setDnd(false, NOW.plusSeconds(2));
        assertFalse(state.isDnd());
    }
}
