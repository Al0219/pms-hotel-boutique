package com.pms.hotelboutique.backend.modules.operations.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * BD3 night audit attempt. A run records its outcome; BLOCKED runs keep the
 * day open and name every blocker so the next attempt is actionable. Run
 * rows are operational state (not financial history); the immutable trail
 * lives in the audit events.
 */
@Entity
@Table(name = "night_audit_runs")
public class NightAuditRun {

    public enum Status {
        IN_PROGRESS,
        COMPLETED,
        BLOCKED
    }

    @Id
    private UUID id;

    @Column(name = "property_id", nullable = false)
    private UUID propertyId;

    @Column(name = "business_day_id", nullable = false)
    private UUID businessDayId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(name = "blockers", columnDefinition = "TEXT")
    private String blockers;

    @Column(name = "started_by")
    private UUID startedBy;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected NightAuditRun() {
    }

    public NightAuditRun(UUID id, UUID propertyId, UUID businessDayId, UUID startedBy, Instant now) {
        if (id == null) {
            throw new IllegalArgumentException("id is required");
        }
        if (propertyId == null) {
            throw new IllegalArgumentException("propertyId is required");
        }
        if (businessDayId == null) {
            throw new IllegalArgumentException("business day id is required");
        }
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.id = id;
        this.propertyId = propertyId;
        this.businessDayId = businessDayId;
        this.startedBy = startedBy;
        this.status = Status.IN_PROGRESS;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void complete(Instant now) {
        finish(Status.COMPLETED, null, now);
    }

    public void block(String blockers, Instant now) {
        if (blockers == null || blockers.isBlank()) {
            throw new IllegalArgumentException("blockers are required");
        }
        finish(Status.BLOCKED, blockers, now);
    }

    private void finish(Status status, String blockers, Instant now) {
        if (this.status != Status.IN_PROGRESS) {
            throw new IllegalStateException("run is already finished");
        }
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.status = status;
        this.blockers = blockers;
        this.finishedAt = now;
        this.updatedAt = now;
    }

    public UUID getId() {
        return id;
    }

    public UUID getPropertyId() {
        return propertyId;
    }

    public UUID getBusinessDayId() {
        return businessDayId;
    }

    public Status getStatus() {
        return status;
    }

    public String getBlockers() {
        return blockers;
    }

    public UUID getStartedBy() {
        return startedBy;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
