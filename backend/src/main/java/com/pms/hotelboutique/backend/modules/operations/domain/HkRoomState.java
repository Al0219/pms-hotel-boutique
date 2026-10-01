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
 * BD3 housekeeping state of one physical room.
 *
 * Lifecycle is DIRTY -&gt; CLEAN -&gt; INSPECTED; a rejected inspection returns
 * the room to DIRTY with the reason kept in the audit trail. DND is a service
 * overlay and never replaces the lifecycle state. Rooms belong to BD2 and are
 * referenced by id only, with cross-property consistency enforced by a
 * composite foreign key. One row per room.
 */
@Entity
@Table(name = "hk_room_states")
public class HkRoomState {

    public enum Status {
        DIRTY,
        CLEAN,
        INSPECTED
    }

    @Id
    private UUID id;

    @Column(name = "property_id", nullable = false)
    private UUID propertyId;

    @Column(name = "room_id", nullable = false)
    private UUID roomId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(nullable = false)
    private boolean dnd;

    @Column(name = "updated_by")
    private UUID updatedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected HkRoomState() {
    }

    public HkRoomState(UUID id, UUID propertyId, UUID roomId, Instant now) {
        if (id == null) {
            throw new IllegalArgumentException("id is required");
        }
        if (propertyId == null) {
            throw new IllegalArgumentException("propertyId is required");
        }
        if (roomId == null) {
            throw new IllegalArgumentException("roomId is required");
        }
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.id = id;
        this.propertyId = propertyId;
        this.roomId = roomId;
        this.status = Status.DIRTY;
        this.dnd = false;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void markClean(Instant now) {
        requireStatus(Status.DIRTY, "mark clean");
        this.status = Status.CLEAN;
        touch(now);
    }

    public void markDirty(Instant now) {
        // Room moves and new stays soil rooms from any operational state.
        this.status = Status.DIRTY;
        touch(now);
    }

    public void inspect(Instant now) {
        requireStatus(Status.CLEAN, "inspect");
        this.status = Status.INSPECTED;
        touch(now);
    }

    public void rejectInspection(Instant now) {
        requireStatus(Status.INSPECTED, "reject inspection");
        this.status = Status.DIRTY;
        touch(now);
    }

    public void setDnd(boolean dnd, Instant now) {
        this.dnd = dnd;
        touch(now);
    }

    public void recordActor(UUID actorId) {
        this.updatedBy = actorId;
    }

    private void requireStatus(Status expected, String action) {
        if (status != expected) {
            throw new IllegalStateException("cannot " + action + " a " + status + " room");
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

    public Status getStatus() {
        return status;
    }

    public boolean isDnd() {
        return dnd;
    }

    public UUID getUpdatedBy() {
        return updatedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
