package com.pms.hotelboutique.backend.modules.operations.domain;

import java.time.Instant;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

class ServiceMessageTests {

    private static final Instant NOW = Instant.parse("2026-09-30T12:00:00Z");

    private static ServiceMessage inbound() {
        return new ServiceMessage(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                ServiceMessage.Channel.WHATSAPP, ServiceMessage.Direction.INBOUND,
                "Late checkout please", NOW);
    }

    @Test
    void recordsInboundMessage() {
        var message = inbound();

        assertEquals(ServiceMessage.Direction.INBOUND, message.getDirection());
        assertEquals("Late checkout please", message.getBody());
        assertEquals(NOW, message.getSentAt());
    }

    @Test
    void rejectsBlankBodyAndMissingParts() {
        assertThrows(IllegalArgumentException.class, () -> new ServiceMessage(UUID.randomUUID(),
                UUID.randomUUID(), UUID.randomUUID(), ServiceMessage.Channel.SMS,
                ServiceMessage.Direction.INBOUND, "  ", NOW));
        assertThrows(IllegalArgumentException.class, () -> new ServiceMessage(UUID.randomUUID(),
                UUID.randomUUID(), UUID.randomUUID(), null, ServiceMessage.Direction.INBOUND,
                "Hi", NOW));
        assertThrows(IllegalArgumentException.class, () -> new ServiceMessage(UUID.randomUUID(),
                UUID.randomUUID(), null, ServiceMessage.Channel.SMS,
                ServiceMessage.Direction.INBOUND, "Hi", NOW));
    }
}
