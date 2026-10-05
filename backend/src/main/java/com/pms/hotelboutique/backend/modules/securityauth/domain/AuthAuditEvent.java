package com.pms.hotelboutique.backend.modules.securityauth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

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

    // Future attribution only: existing producers intentionally leave these fields null.
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
