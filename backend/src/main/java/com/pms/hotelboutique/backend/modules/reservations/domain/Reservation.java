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
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * BD3 commercial reservation container.
 *
 * A Reservation groups N {@code ReservationStay} (Fase 3) and never equals a
 * single stay: multi-room bookings keep one Reservation with several stays.
 * Lifecycle in Fase 2 is PENDING -&gt; CONFIRMED, with CANCELLED as terminal
 * state from either. No delete API is offered; history is preserved and
 * future changes will be audited (Fase 6).
 */
@Entity
@Table(name = "reservations")
public class Reservation {

    public enum Status {
        PENDING,
        CONFIRMED,
        CANCELLED
    }

    @Id
    private UUID id;

    /**
     * Raw id on purpose: BD1 owns the properties table and exposes no JPA
     * read model to reuse. Existence is enforced by the FK.
     */
    @Column(name = "property_id", nullable = false)
    private UUID propertyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_guest_id")
    private GuestProfile bookingGuest;

    @Column(name = "confirmation_code", nullable = false, unique = true)
    private String confirmationCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(nullable = false, columnDefinition = "CHAR(3)")
    @JdbcTypeCode(SqlTypes.CHAR)
    private String currency;

    @Column(name = "source_channel", nullable = false)
    private String sourceChannel;

    @Column(name = "source_reference")
    private String sourceReference;

    /**
     * Group pickup wiring (F13). Raw ids on purpose: the group/block live in
     * BD3's commercial module. Both nullable: direct reservations carry
     * neither. When a block is set, its group is always set too.
     */
    @Column(name = "group_id")
    private UUID groupId;

    @Column(name = "room_block_id")
    private UUID roomBlockId;

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Reservation() {
    }

    public Reservation(UUID id, UUID propertyId, String confirmationCode, String currency,
            String sourceChannel, Instant now) {
        if (id == null) {
            throw new IllegalArgumentException("id is required");
        }
        if (propertyId == null) {
            throw new IllegalArgumentException("propertyId is required");
        }
        requireCode(confirmationCode);
        requireCurrency(currency);
        requireChannel(sourceChannel);
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.id = id;
        this.propertyId = propertyId;
        this.confirmationCode = confirmationCode;
        this.currency = currency;
        this.sourceChannel = sourceChannel.trim();
        this.status = Status.PENDING;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void linkBookingGuest(GuestProfile bookingGuest) {
        if (bookingGuest == null) {
            throw new IllegalArgumentException("bookingGuest is required");
        }
        this.bookingGuest = bookingGuest;
    }

    public void linkBlock(UUID groupId, UUID roomBlockId) {
        if (groupId == null || roomBlockId == null) {
            throw new IllegalArgumentException("group and block ids are required");
        }
        if (status == Status.CANCELLED) {
            throw new IllegalStateException("a CANCELLED reservation cannot join a block");
        }
        this.groupId = groupId;
        this.roomBlockId = roomBlockId;
    }

    public void unlinkBlock() {
        this.groupId = null;
        this.roomBlockId = null;
    }

    public void updateSource(String sourceReference, String notes, Instant now) {
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.sourceReference = sourceReference;
        this.notes = notes;
        this.updatedAt = now;
    }

    public void confirm(Instant now) {
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        if (status != Status.PENDING) {
            throw new IllegalStateException("only a PENDING reservation can be confirmed");
        }
        this.status = Status.CONFIRMED;
        this.updatedAt = now;
    }

    public void cancel(Instant now) {
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        if (status == Status.CANCELLED) {
            throw new IllegalStateException("reservation is already cancelled");
        }
        this.status = Status.CANCELLED;
        this.updatedAt = now;
    }

    private static void requireCode(String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("confirmationCode must not be blank");
        }
    }

    private static void requireCurrency(String currency) {
        if (currency == null || !currency.matches("^[A-Z]{3}$")) {
            throw new IllegalArgumentException("currency must be an ISO 4217 code");
        }
    }

    private static void requireChannel(String channel) {
        if (channel == null || channel.isBlank()) {
            throw new IllegalArgumentException("sourceChannel must not be blank");
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getPropertyId() {
        return propertyId;
    }

    public GuestProfile getBookingGuest() {
        return bookingGuest;
    }

    public String getConfirmationCode() {
        return confirmationCode;
    }

    public Status getStatus() {
        return status;
    }

    public String getCurrency() {
        return currency;
    }

    public String getSourceChannel() {
        return sourceChannel;
    }

    public String getSourceReference() {
        return sourceReference;
    }

    public UUID getGroupId() {
        return groupId;
    }

    public UUID getRoomBlockId() {
        return roomBlockId;
    }

    public String getNotes() {
        return notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
