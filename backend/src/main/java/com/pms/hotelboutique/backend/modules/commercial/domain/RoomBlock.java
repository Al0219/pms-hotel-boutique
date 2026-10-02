package com.pms.hotelboutique.backend.modules.commercial.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * BD3 commercial room hold for a group (F13).
 *
 * <p>A block never moves physical rooms and never consumes ATS by itself: it
 * only reserves the right for group reservations (pickup) to consume up to
 * {@code unitsHeld}. Pickup is always derived from stays, never stored.
 * Cutoff/release only stops new links; existing pickup is preserved.</p>
 */
@Entity
@Table(name = "room_blocks")
public class RoomBlock {

    public enum Status {
        ACTIVE,
        RELEASED
    }

    @Id
    private UUID id;

    @Column(name = "group_id", nullable = false)
    private UUID groupId;

    /**
     * Raw ids on purpose: BD1 owns properties and BD2 owns room types; neither
     * exposes a JPA read model to reuse. Existence is enforced by FKs.
     */
    @Column(name = "property_id", nullable = false)
    private UUID propertyId;

    @Column(name = "room_type_id", nullable = false)
    private UUID roomTypeId;

    @Column(nullable = false)
    private LocalDate arrival;

    @Column(nullable = false)
    private LocalDate departure;

    @Column(name = "units_held", nullable = false)
    private int unitsHeld;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected RoomBlock() {
    }

    public RoomBlock(UUID id, UUID groupId, UUID propertyId, UUID roomTypeId,
            LocalDate arrival, LocalDate departure, int unitsHeld, Instant now) {
        if (id == null) {
            throw new IllegalArgumentException("id is required");
        }
        if (groupId == null) {
            throw new IllegalArgumentException("groupId is required");
        }
        if (propertyId == null) {
            throw new IllegalArgumentException("propertyId is required");
        }
        if (roomTypeId == null) {
            throw new IllegalArgumentException("roomTypeId is required");
        }
        requirePeriod(arrival, departure);
        if (unitsHeld <= 0) {
            throw new IllegalArgumentException("unitsHeld must be positive");
        }
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.id = id;
        this.groupId = groupId;
        this.propertyId = propertyId;
        this.roomTypeId = roomTypeId;
        this.arrival = arrival;
        this.departure = departure;
        this.unitsHeld = unitsHeld;
        this.status = Status.ACTIVE;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void release(Instant now) {
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.status = Status.RELEASED;
        this.updatedAt = now;
    }

    public void reactivate(Instant now) {
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.status = Status.ACTIVE;
        this.updatedAt = now;
    }

    public boolean acceptsLinks() {
        return status == Status.ACTIVE;
    }

    private static void requirePeriod(LocalDate arrival, LocalDate departure) {
        if (arrival == null || departure == null) {
            throw new IllegalArgumentException("arrival and departure are required");
        }
        if (!arrival.isBefore(departure)) {
            throw new IllegalArgumentException("arrival must precede departure");
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getGroupId() {
        return groupId;
    }

    public UUID getPropertyId() {
        return propertyId;
    }

    public UUID getRoomTypeId() {
        return roomTypeId;
    }

    public LocalDate getArrival() {
        return arrival;
    }

    public LocalDate getDeparture() {
        return departure;
    }

    public int getUnitsHeld() {
        return unitsHeld;
    }

    public Status getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
