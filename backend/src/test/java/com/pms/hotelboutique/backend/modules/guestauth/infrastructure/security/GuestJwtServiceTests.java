package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class GuestJwtServiceTests {
    private static final String KEY = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";

    @Test
    void issuesAndParsesOnlyASeparatedGuestPrincipal() {
        GuestJwtService service = new GuestJwtService(KEY, Duration.ofMinutes(15));
        UUID accountId = UUID.randomUUID(); UUID sessionId = UUID.randomUUID();

        GuestPrincipal parsed = service.parse(service.issue(new GuestPrincipal(accountId, sessionId, "guest@example.test"), Instant.now()));

        assertEquals(accountId, parsed.guestAccountId());
        assertEquals(sessionId, parsed.sessionId());
    }
}
