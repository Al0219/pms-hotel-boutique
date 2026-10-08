package com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Insert and read access for audit events. No update or delete method is
 * ever called: audit history is append-only by design and by trigger.
 */
public interface ReservationAuditEventRepository extends JpaRepository<ReservationAuditEvent, UUID> {

    List<ReservationAuditEvent> findByEntityTypeAndEntityIdOrderByOccurredAtAsc(String entityType,
            UUID entityId);

    List<ReservationAuditEvent> findByCorrelationIdOrderByOccurredAtAsc(UUID correlationId);
}
