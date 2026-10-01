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
 * BD3 front-office vs housekeeping discrepancy.
 *
 * Lifecycle is OPEN -&gt; INVESTIGATING -&gt; RECONCILED (or CANCELLED): the
 * mismatch is investigated, given a reason and reconciled, with every step
 * audited. Rooms belong to BD2 and are referenced by id only. No delete API
 * is offered.
 */
@Entity
@Table(name = "hk_discrepancies")
public class HkDiscrepancy {

    public enum FoStatus {
        OCCUPIED,
        VACANT
    }

    public enum HkStatus {
        DIRTY,
        CLEAN,
        INSPECTED
    }

    public enum Status {
        OPEN,
        INVESTIGATING,
        RECONCILED,
        CANCELLED
    }

    @Id
    private UUID id;

    @Column(name = "property_id", nullable = false)
    private UUID propertyId;

    @Column(name = "room_id", nullable = false)
    private UUID roomId;

    @Enumerated(EnumType.STRING)
    @Column(name = "fo_status", nullable = false)
    private FoStatus foStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "hk_status", nullable = false)
    private HkStatus hkStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(name = "resolution")
    private String resolution;

    @Column(name = "reported_by")
    private UUID reportedBy;

    @Column(name = "resolved_by")
    private UUID resolvedBy;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected HkDiscrepancy() {
    }

    public HkDiscrepancy(UUID id, UUID propertyId, UUID roomId, FoStatus foStatus,
            HkStatus hkStatus, Instant now) {
        if (id == null) {
            throw new IllegalArgumentException("id is required");
        }
        if (propertyId == null) {
            throw new IllegalArgumentException("propertyId is required");
        }
        if (roomId == null) {
            throw new IllegalArgumentException("roomId is required");
        }
        if (foStatus == null) {
            throw new IllegalArgumentException("front-office status is required");
        }
        if (hkStatus == null) {
            throw new IllegalArgumentException("housekeeping status is required");
        }
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.id = id;
        this.propertyId = propertyId;
        this.roomId = roomId;
        this.foStatus = foStatus;
        this.hkStatus = hkStatus;
        this.status = Status.OPEN;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void reportBy(UUID actorId) {
        this.reportedBy = actorId;
    }

    public void investigate(Instant now) {
        if (status != Status.OPEN) {
            throw new IllegalStateException("cannot investigate a " + status + " discrepancy");
        }
        this.status = Status.INVESTIGATING;
        touch(now);
    }

    public void reconcile(String resolution, UUID actorId, Instant now) {
        if (status != Status.INVESTIGATING) {
            throw new IllegalStateException("cannot reconcile a " + status + " discrepancy");
        }
        if (resolution == null || resolution.isBlank()) {
            throw new IllegalArgumentException("resolution reason is required");
        }
        this.status = Status.RECONCILED;
        this.resolution = resolution.trim();
        this.resolvedBy = actorId;
        this.resolvedAt = now;
        touch(now);
    }

    public void cancel(Instant now) {
        if (status != Status.OPEN && status != Status.INVESTIGATING) {
            throw new IllegalStateException("cannot cancel a " + status + " discrepancy");
        }
        this.status = Status.CANCELLED;
        touch(now);
    }

    private void touch(Instant now) {
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.updatedAt = now;
    }

    public UUID getId() {
        return id;
    }

    public UUID getPropertyId() {
        return propertyId;
    }

    public UUID getRoomId() {
        return roomId;
    }

    public FoStatus getFoStatus() {
        return foStatus;
    }

    public HkStatus getHkStatus() {
        return hkStatus;
    }

    public Status getStatus() {
        return status;
    }

    public String getResolution() {
        return resolution;
    }

    public UUID getReportedBy() {
        return reportedBy;
    }

    public UUID getResolvedBy() {
        return resolvedBy;
    }

    public Instant getResolvedAt() {
        return resolvedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
