package com.pms.hotelboutique.backend.modules.reservations.domain;

import com.pms.hotelboutique.backend.modules.guestauth.domain.GuestAccount;
import java.time.Instant;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

class GuestProfileTests {

    private static final Instant NOW = Instant.parse("2026-09-30T12:00:00Z");

    @Test
    void createsActiveProfileWithoutAccount() {
        var profile = new GuestProfile(UUID.randomUUID(), "Ana", "Lopez", NOW);

        assertEquals(GuestProfile.Status.ACTIVE, profile.getStatus());
        assertTrue(profile.isActive());
        assertNull(profile.getGuestAccount());
        assertNull(profile.getPropertyId());
        assertEquals("Ana", profile.getFirstName());
        assertEquals(NOW, profile.getCreatedAt());
    }

    @Test
    void rejectsBlankNames() {
        assertThrows(IllegalArgumentException.class,
                () -> new GuestProfile(UUID.randomUUID(), "  ", "Lopez", NOW));
        assertThrows(IllegalArgumentException.class,
                () -> new GuestProfile(UUID.randomUUID(), "Ana", null, NOW));
        var profile = new GuestProfile(UUID.randomUUID(), "Ana", "Lopez", NOW);
        assertThrows(IllegalArgumentException.class,
                () -> profile.updateContact("Ana", " ", null, null, null, null, null, NOW));
    }

    @Test
    void linksAndUnlinksAccountWithoutMergingIdentities() {
        var profile = new GuestProfile(UUID.randomUUID(), "Ana", "Lopez", NOW);
        var account = new GuestAccount(UUID.randomUUID(), "ana@example.test", NOW);

        profile.linkAccount(account);

        assertEquals(account.getId(), profile.getGuestAccount().getId());
        // Profile contact data stays independent from the auth account.
        assertNull(profile.getEmail());

        profile.unlinkAccount();
        assertNull(profile.getGuestAccount());
    }

    @Test
    void deactivatesAndReactivates() {
        var profile = new GuestProfile(UUID.randomUUID(), "Ana", "Lopez", NOW);

        profile.deactivate(NOW.plusSeconds(10));

        assertFalse(profile.isActive());
        assertEquals(GuestProfile.Status.INACTIVE, profile.getStatus());

        profile.activate(NOW.plusSeconds(20));
        assertTrue(profile.isActive());
    }
}
