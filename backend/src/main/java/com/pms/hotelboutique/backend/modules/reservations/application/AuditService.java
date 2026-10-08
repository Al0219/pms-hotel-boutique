package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * BD3 audit operations (Fase 6).
 *
 * Events are append-only: this service records and reads, never edits.
 * Wiring automatic recording into the booking/folio flows (with the real
 * authenticated actor) belongs to the Fase 7 integration.
 */
public interface AuditService {

    AuditEventView record(@Valid RecordAuditCommand command);

    AuditEventView get(UUID id);

    List<AuditEventView> findByEntity(String entityType, UUID entityId);

    List<AuditEventView> findByCorrelation(UUID correlationId);

    record RecordAuditCommand(
            @NotNull ReservationAuditEvent.ActorType actorType,
            UUID actorId,
            @NotBlank @Size(max = 64) String action,
            @NotBlank @Size(max = 64) String entityType,
            @NotNull UUID entityId,
            UUID propertyId,
            String beforeState,
            String afterState,
            @Size(max = 500) String reason,
            UUID correlationId) {
    }

    record AuditEventView(
            UUID id,
            Instant occurredAt,
            ReservationAuditEvent.ActorType actorType,
            UUID actorId,
            String action,
            String entityType,
            UUID entityId,
            UUID propertyId,
            String beforeState,
            String afterState,
            String reason,
            UUID correlationId,
            Instant createdAt) {

        static AuditEventView from(ReservationAuditEvent event) {
            return new AuditEventView(
                    event.getId(), event.getOccurredAt(), event.getActorType(), event.getActorId(),
                    event.getAction(), event.getEntityType(), event.getEntityId(), event.getPropertyId(),
                    event.getBeforeState(), event.getAfterState(), event.getReason(),
                    event.getCorrelationId(), event.getCreatedAt());
        }
    }
}
