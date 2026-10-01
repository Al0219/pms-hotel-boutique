package com.pms.hotelboutique.backend.modules.reservations.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * BD3 physical lodging unit inside a {@link Reservation}.
 *
 * One Reservation holds N stays (multi-room). Room inventory itself belongs
 * to BD2: rooms and room types are referenced by id only, with cross-property
 * consistency enforced by composite foreign keys. No delete API is offered.
 */
@Entity
@Table(name = "reservation_stays")
public class ReservationStay {

    public enum Status {
        RESERVED,
        IN_HOUSE,
        CHECKED_OUT,
        CANCELLED,
        NO_SHOW
    }

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id", nullable = false)
    private Reservation reservation;

    /**
     * Raw ids on purpose: BD2 owns rooms/room_types and exposes no JPA read
     * model to reuse. Existence is enforced by composite foreign keys.
     */
    @Column(name = "property_id", nullable = false)
    private UUID propertyId;

    @Column(name = "room_type_id", nullable = false)
    private UUID roomTypeId;

    @Column(name = "room_id")
    private UUID roomId;

    @Column(nullable = false)
    private LocalDate arrival;

    @Column(nullable = false)
    private LocalDate departure;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ReservationStay() {
    }

    public ReservationStay(UUID id, Reservation reservation, UUID propertyId, UUID roomTypeId,
            LocalDate arrival, LocalDate departure, Instant now) {
        if (id == null) {
            throw new IllegalArgumentException("id is required");
        }
        if (reservation == null) {
            throw new IllegalArgumentException("reservation is required");
        }
        if (propertyId == null) {
            throw new IllegalArgumentException("propertyId is required");
        }
        if (roomTypeId == null) {
            throw new IllegalArgumentException("roomTypeId is required");
        }
        requirePeriod(arrival, departure);
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.id = id;
        this.reservation = reservation;
        this.propertyId = propertyId;
        this.roomTypeId = roomTypeId;
        this.arrival = arrival;
        this.departure = departure;
        this.status = Status.RESERVED;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void assignRoom(UUID roomId, Instant now) {
        if (roomId == null) {
            throw new IllegalArgumentException("roomId is required");
        }
        requireMutable("assign a room");
        this.roomId = roomId;
        touch(now);
    }

    public void clearRoom(Instant now) {
        requireMutable("clear the room");
        this.roomId = null;
        touch(now);
    }

    public void updateDates(LocalDate arrival, LocalDate departure, Instant now) {
        requireMutable("change dates");
        requirePeriod(arrival, departure);
        this.arrival = arrival;
        this.departure = departure;
        touch(now);
    }

    public void checkIn(Instant now) {
        requireStatus(Status.RESERVED, "check in");
        this.status = Status.IN_HOUSE;
        touch(now);
    }

    public void checkOut(Instant now) {
        requireStatus(Status.IN_HOUSE, "check out");
        this.status = Status.CHECKED_OUT;
        touch(now);
    }

    public void cancel(Instant now) {
        requireMutable("cancel");
        this.status = Status.CANCELLED;
        touch(now);
    }

    public void markNoShow(Instant now) {
        requireStatus(Status.RESERVED, "mark no-show");
        this.status = Status.NO_SHOW;
        touch(now);
    }

    private void requireMutable(String action) {
        if (status != Status.RESERVED && status != Status.IN_HOUSE) {
            throw new IllegalStateException("cannot " + action + " from status " + status);
        }
    }

    private void requireStatus(Status expected, String action) {
        if (status != expected) {
            throw new IllegalStateException("cannot " + action + " from status " + status);
        }
    }

    private static void requirePeriod(LocalDate arrival, LocalDate departure) {
        if (arrival == null || departure == null) {
            throw new IllegalArgumentException("arrival and departure are required");
        }
        if (!arrival.isBefore(departure)) {
            throw new IllegalArgumentException("arrival must precede departure");
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

    public Reservation getReservation() {
        return reservation;
    }

    public UUID getPropertyId() {
        return propertyId;
    }

    public UUID getRoomTypeId() {
        return roomTypeId;
    }

    public UUID getRoomId() {
        return roomId;
    }

    public LocalDate getArrival() {
        return arrival;
    }

    public LocalDate getDeparture() {
        return departure;
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
