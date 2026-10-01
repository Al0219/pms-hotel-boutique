package com.pms.hotelboutique.backend.modules.reservations.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * BD3 append-only audit event.
 *
 * Records actor, action, entity, before/after snapshots when applicable,
 * reason, time and correlation id, per the backend audit contract. Instances
 * are write-once: no setters, no status, no update timestamp. The database
 * trigger rejects UPDATE and DELETE as a second line of defense.
 */
@Entity
@Table(name = "reservation_audit_events")
public class ReservationAuditEvent {

    public enum ActorType {
        STAFF,
        GUEST,
        SYSTEM
    }

    @Id
    private UUID id;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "actor_type", nullable = false)
    private ActorType actorType;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(nullable = false)
    private String action;

    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    @Column(name = "property_id")
    private UUID propertyId;

    @Column(name = "before_state", columnDefinition = "TEXT")
    private String beforeState;

    @Column(name = "after_state", columnDefinition = "TEXT")
    private String afterState;

    @Column(name = "reason")
    private String reason;

    @Column(name = "correlation_id")
    private UUID correlationId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ReservationAuditEvent() {
    }

    public ReservationAuditEvent(UUID id, ActorType actorType, UUID actorId, String action,
            String entityType, UUID entityId, UUID propertyId, String beforeState, String afterState,
            String reason, UUID correlationId, Instant now) {
        if (id == null) {
            throw new IllegalArgumentException("id is required");
        }
        if (actorType == null) {
            throw new IllegalArgumentException("actorType is required");
        }
        requireText(action, "action");
        requireText(entityType, "entityType");
        if (entityId == null) {
            throw new IllegalArgumentException("entityId is required");
        }
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.id = id;
        this.occurredAt = now;
        this.actorType = actorType;
        this.actorId = actorId;
        this.action = action.trim();
        this.entityType = entityType.trim();
        this.entityId = entityId;
        this.propertyId = propertyId;
        this.beforeState = beforeState;
        this.afterState = afterState;
        this.reason = reason;
        this.correlationId = correlationId;
        this.createdAt = now;
    }

    private static void requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
    }

    public UUID getId() {
        return id;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public ActorType getActorType() {
        return actorType;
    }

    public UUID getActorId() {
        return actorId;
    }

    public String getAction() {
        return action;
    }

    public String getEntityType() {
        return entityType;
    }

    public UUID getEntityId() {
        return entityId;
    }

    public UUID getPropertyId() {
        return propertyId;
    }

    public String getBeforeState() {
        return beforeState;
    }

    public String getAfterState() {
        return afterState;
    }

    public String getReason() {
        return reason;
    }

    public UUID getCorrelationId() {
        return correlationId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
