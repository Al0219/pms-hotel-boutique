package com.pms.hotelboutique.backend.modules.securityauth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import java.util.Objects;

@Entity
@Table(name = "auth_audit_events")
public class AuthAuditEvent {
    @Id
    private UUID id;
    @Column(name = "event_type", nullable = false)
    private String eventType;
    @Column(name = "staff_user_id")
    private UUID staffUserId;
    @Column(name = "session_id")
    private UUID sessionId;
    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;
    @Column(nullable = false)
    private String detail;

    // Nullable attribution preserves legacy events and emitters without trusted context.
    @Column(name = "organization_id")
    private UUID organizationId;
    @Column(name = "property_id")
    private UUID propertyId;
    @Column(name = "scope_kind", length = 16)
    private String scopeKind;
    @Column(name = "actor_context", length = 16)
    private String actorContext;
    @Column(name = "actor_id")
    private UUID actorId;
    @Column(name = "correlation_id")
    private UUID correlationId;

    public static AuthAuditEvent staffAction(String eventType, UUID subjectId, UUID sessionId,
            String detail, Instant occurredAt, UUID authenticatedActorId) {
        AuthAuditEvent event = new AuthAuditEvent(eventType, subjectId, sessionId, detail, occurredAt);
        event.actorContext = "STAFF";
        event.actorId = Objects.requireNonNull(authenticatedActorId, "authenticatedActorId");
        return event;
    }

    public static AuthAuditEvent bootstrapCreated(UUID subjectId, UUID organizationId, Instant occurredAt) {
        AuthAuditEvent event = new AuthAuditEvent("STAFF_BOOTSTRAP_CREATED", subjectId, null,
                "deployment_secret", occurredAt);
        event.organizationId = Objects.requireNonNull(organizationId, "organizationId");
        event.scopeKind = "ORGANIZATION";
        event.actorContext = "SYSTEM";
        return event;
    }

    protected AuthAuditEvent() { }

    public AuthAuditEvent(String eventType, UUID staffUserId, UUID sessionId, String detail, Instant occurredAt) {
        this.id = UUID.randomUUID();
        this.eventType = eventType;
        this.staffUserId = staffUserId;
        this.sessionId = sessionId;
        this.detail = detail;
        this.occurredAt = occurredAt;
    }
}
