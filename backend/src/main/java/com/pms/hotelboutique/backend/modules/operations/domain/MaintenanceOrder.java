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
 * BD3 maintenance order (OT).
 *
 * An order may target a room (by id, BD2-owned) or a common area (no room).
 * It may reference the OOO/OOS record it caused on BD2's table. Resolving an
 * order never releases the outage automatically: that is an explicit,
 * audited operation. No delete API is offered.
 */
@Entity
@Table(name = "maintenance_orders")
public class MaintenanceOrder {

    public enum Priority {
        LOW,
        MEDIUM,
        HIGH,
        URGENT
    }

    public enum Status {
        OPEN,
        IN_PROGRESS,
        RESOLVED,
        CANCELLED
    }

    @Id
    private UUID id;

    @Column(name = "property_id", nullable = false)
    private UUID propertyId;

    @Column(name = "room_id")
    private UUID roomId;

    @Column(name = "ooo_record_id")
    private UUID oooRecordId;

    @Column(nullable = false)
    private String title;

    @Column(name = "description")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "assigned_to")
    private UUID assignedTo;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected MaintenanceOrder() {
    }

    public MaintenanceOrder(UUID id, UUID propertyId, String title, Instant now) {
        if (id == null) {
            throw new IllegalArgumentException("id is required");
        }
        if (propertyId == null) {
            throw new IllegalArgumentException("propertyId is required");
        }
        requireTitle(title);
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.id = id;
        this.propertyId = propertyId;
        this.title = title.trim();
        this.priority = Priority.MEDIUM;
        this.status = Status.OPEN;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void describe(String description, Priority priority) {
        if (priority == null) {
            throw new IllegalArgumentException("priority is required");
        }
        this.description = description;
        this.priority = priority;
    }

    public void targetRoom(UUID roomId) {
        this.roomId = roomId;
    }

    public void linkOutage(UUID oooRecordId) {
        if (oooRecordId == null) {
            throw new IllegalArgumentException("outage record id is required");
        }
        this.oooRecordId = oooRecordId;
    }

    public void reportBy(UUID actorId) {
        this.createdBy = actorId;
    }

    public void assignTo(UUID actorId, Instant now) {
        requireOpen("assign");
        this.assignedTo = actorId;
        touch(now);
    }

    public void startProgress(Instant now) {
        requireOpen("start progress on");
        this.status = Status.IN_PROGRESS;
        touch(now);
    }

    public void resolve(Instant now) {
        if (status != Status.OPEN && status != Status.IN_PROGRESS) {
            throw new IllegalStateException("cannot resolve a " + status + " order");
        }
        this.status = Status.RESOLVED;
        this.resolvedAt = now;
        touch(now);
    }

    public void cancel(Instant now) {
        requireOpen("cancel");
        this.status = Status.CANCELLED;
        touch(now);
    }

    public void reopen(Instant now) {
        if (status != Status.RESOLVED) {
            throw new IllegalStateException("cannot reopen a " + status + " order");
        }
        this.status = Status.OPEN;
        this.resolvedAt = null;
        touch(now);
    }

    private void requireOpen(String action) {
        if (status != Status.OPEN && status != Status.IN_PROGRESS) {
            throw new IllegalStateException("cannot " + action + " a " + status + " order");
        }
    }

    private static void requireTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("title must not be blank");
        }
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

    public UUID getOooRecordId() {
        return oooRecordId;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public Priority getPriority() {
        return priority;
    }

    public Status getStatus() {
        return status;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public UUID getAssignedTo() {
        return assignedTo;
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
