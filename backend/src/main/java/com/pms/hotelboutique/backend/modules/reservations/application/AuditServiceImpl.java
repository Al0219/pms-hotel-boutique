package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationAuditEventRepository;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@Transactional
public class AuditServiceImpl implements AuditService {

    private final ReservationAuditEventRepository events;

    public AuditServiceImpl(ReservationAuditEventRepository events) {
        this.events = events;
    }

    @Override
    public AuditEventView record(@Valid RecordAuditCommand command) {
        Instant now = Instant.now();
        try {
            ReservationAuditEvent event = new ReservationAuditEvent(UUID.randomUUID(),
                    command.actorType(), command.actorId(), command.action(), command.entityType(),
                    command.entityId(), command.propertyId(), command.beforeState(),
                    command.afterState(), blankToNull(command.reason()), command.correlationId(), now);
            return AuditEventView.from(events.save(event));
        } catch (IllegalArgumentException e) {
            throw new AuditException(e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public AuditEventView get(UUID id) {
        return AuditEventView.from(existing(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditEventView> findByEntity(String entityType, UUID entityId) {
        if (entityType == null || entityType.isBlank()) {
            throw new AuditException("entity type is required");
        }
        if (entityId == null) {
            throw new AuditException("entity id is required");
        }
        return events.findByEntityTypeAndEntityIdOrderByOccurredAtAsc(entityType, entityId).stream()
                .map(AuditEventView::from).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditEventView> findByCorrelation(UUID correlationId) {
        if (correlationId == null) {
            throw new AuditException("correlation id is required");
        }
        return events.findByCorrelationIdOrderByOccurredAtAsc(correlationId).stream()
                .map(AuditEventView::from).toList();
    }

    private ReservationAuditEvent existing(UUID id) {
        if (id == null) {
            throw new AuditException("audit event id is required");
        }
        return events.findById(id).orElseThrow(() -> new AuditException("audit event not found"));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
