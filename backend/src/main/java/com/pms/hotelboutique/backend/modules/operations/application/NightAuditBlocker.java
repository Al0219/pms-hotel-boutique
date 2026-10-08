package com.pms.hotelboutique.backend.modules.operations.application;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Night audit blocker check (Fase 11 SPI).
 *
 * Each check inspects one domain for conditions that forbid closing the
 * business day and returns human-readable blockers; an empty list passes.
 * Other modules (for example folio postings from punto 1) plug in by
 * declaring their own beans — no changes to the night audit core.
 */
public interface NightAuditBlocker {

    String name();

    List<String> blockers(UUID propertyId, LocalDate businessDate);
}
