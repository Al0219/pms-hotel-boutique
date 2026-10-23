package com.pms.hotelboutique.backend.modules.reservations.application;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Internal transaction protocol shared by folio writers and Staff checkout. */
@Component
public class FolioTransactionGuard {
    private final JdbcTemplate jdbc;

    public FolioTransactionGuard(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional(propagation = Propagation.MANDATORY)
    public void lock(UUID propertyId, UUID reservationOrFolioId) {
        if (propertyId == null || reservationOrFolioId == null) throw new IllegalArgumentException("financial context is required");
        // PMSF namespace; all linked folios share their reservation key. Collisions only add waiting.
        jdbc.query("SELECT pg_advisory_xact_lock(1347244870, ?)", row -> { },
                java.util.Objects.hash(propertyId, reservationOrFolioId));
    }
}
