package com.pms.hotelboutique.backend.modules.securityauth.application;

import java.time.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class StaffAdminCursorCodecTests {
    @Test void authenticatesPositionAndCompleteContextAndRejectsTamperingAndRestart() {
        var codec = new StaffAdminCursorCodec(Clock.fixed(Instant.parse("2026-10-22T12:00:00Z"), ZoneOffset.UTC));
        var position = new StaffAdminCursorCodec.Position("literal_%!\\user", UUID.randomUUID());
        String cursor = codec.encode(position, "session|organization|permission|scope|filters|limit");
        assertEquals(position, codec.decode(cursor, "session|organization|permission|scope|filters|limit"));
        for (String invalid : new String[]{"", "broken", cursor + "x", "x" + cursor.substring(1), cursor + ".", "a".repeat(4097)})
            assertThrows(StaffAdminReadException.class, () -> codec.decode(invalid, "session|organization|permission|scope|filters|limit"));
        assertThrows(StaffAdminReadException.class, () -> codec.decode(cursor, "other-context"));
        assertThrows(StaffAdminReadException.class, () -> new StaffAdminCursorCodec().decode(cursor, "session|organization|permission|scope|filters|limit"));
    }
    @Test void expiresAtExactlyFifteenMinutes() {
        class MutableClock extends Clock {
            Instant now = Instant.parse("2026-10-22T12:00:00Z");
            public ZoneId getZone() { return ZoneOffset.UTC; }
            public Clock withZone(ZoneId zone) { return this; }
            public Instant instant() { return now; }
        }
        var clock = new MutableClock(); var codec = new StaffAdminCursorCodec(clock);
        var position = new StaffAdminCursorCodec.Position("user", UUID.randomUUID());
        String cursor = codec.encode(position, "ctx");
        clock.now = clock.now.plusSeconds(899);
        assertEquals(position, codec.decode(cursor, "ctx"));
        clock.now = clock.now.plusSeconds(1);
        var error = assertThrows(StaffAdminReadException.class, () -> codec.decode(cursor, "ctx"));
        assertEquals(StaffAdminReadException.Failure.INVALID_CURSOR, error.failure());
    }
}
