package com.pms.hotelboutique.backend.modules.reservations.domain;

import com.pms.hotelboutique.backend.shared.money.MinorUnits;
import com.pms.hotelboutique.backend.shared.money.MonetaryAmount;
import java.time.Instant;
import java.util.Currency;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

class FolioMovementTests {

    private static final Instant NOW = Instant.parse("2026-09-30T12:00:00Z");
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");
    private static final Currency GTQ = Currency.getInstance("GTQ");

    private static Folio folio() {
        return new Folio(UUID.randomUUID(), PROPERTY, Folio.Type.GUEST, "GTQ", NOW);
    }

    private static MonetaryAmount amount(long minor) {
        return new MonetaryAmount(new MinorUnits(minor), GTQ);
    }

    @Test
    void recordsImmutableMovement() {
        var movement = new FolioMovement(UUID.randomUUID(), folio(), FolioMovement.Kind.CHARGE,
                amount(116000), "Room night", null, null, NOW);

        assertEquals(116000, movement.amount().minorUnits().value());
        assertEquals(GTQ, movement.amount().currency());
    }

    @Test
    void rejectsZeroMismatchedOrBlank() {
        var folio = folio();
        assertThrows(IllegalArgumentException.class, () -> new FolioMovement(UUID.randomUUID(),
                folio, FolioMovement.Kind.CHARGE, amount(0), "Zero", null, null, NOW));
        assertThrows(IllegalArgumentException.class, () -> new FolioMovement(UUID.randomUUID(),
                folio, FolioMovement.Kind.CHARGE,
                new MonetaryAmount(new MinorUnits(100), Currency.getInstance("USD")),
                "Foreign", null, null, NOW));
        assertThrows(IllegalArgumentException.class, () -> new FolioMovement(UUID.randomUUID(),
                folio, FolioMovement.Kind.CHARGE, amount(100), "  ", null, null, NOW));
    }
}
