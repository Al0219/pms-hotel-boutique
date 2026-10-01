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
 * BD3 financial account (folio) for a guest, company snapshot or master
 * group. The header carries lifecycle only; money lives in append-only
 * {@link FolioMovement} rows and the balance is always derived, never stored.
 */
@Entity
@Table(name = "folios")
public class Folio {

    public enum Type {
        GUEST,
        COMPANY,
        MASTER
    }

    public enum Status {
        OPEN,
        SETTLED,
        CLOSED
    }

    @Id
    private UUID id;

    @Column(name = "property_id", nullable = false)
    private UUID propertyId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id")
    private Reservation reservation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stay_id")
    private ReservationStay stay;

    @Column(nullable = false, columnDefinition = "CHAR(3)")
    @JdbcTypeCode(SqlTypes.CHAR)
    private String currency;

    @Column(name = "holder_label")
    private String holderLabel;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Folio() {
    }

    public Folio(UUID id, UUID propertyId, Type type, String currency, Instant now) {
        if (id == null) {
            throw new IllegalArgumentException("id is required");
        }
        if (propertyId == null) {
            throw new IllegalArgumentException("propertyId is required");
        }
        if (type == null) {
            throw new IllegalArgumentException("type is required");
        }
        requireCurrency(currency);
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.id = id;
        this.propertyId = propertyId;
        this.type = type;
        this.currency = currency;
        this.status = Status.OPEN;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void linkReservation(Reservation reservation) {
        if (reservation == null) {
            throw new IllegalArgumentException("reservation is required");
        }
        this.reservation = reservation;
    }

    public void linkStay(ReservationStay stay) {
        if (stay == null) {
            throw new IllegalArgumentException("stay is required");
        }
        this.stay = stay;
    }

    public void labelHolder(String holderLabel) {
        this.holderLabel = holderLabel;
    }

    public void settle(Instant now) {
        requireStatus(Status.OPEN, "settle");
        this.status = Status.SETTLED;
        touch(now);
    }

    public void reopen(Instant now) {
        requireStatus(Status.SETTLED, "reopen");
        this.status = Status.OPEN;
        touch(now);
    }

    public void close(Instant now) {
        requireStatus(Status.SETTLED, "close");
        this.status = Status.CLOSED;
        touch(now);
    }

    public boolean acceptsPostings() {
        return status == Status.OPEN;
    }

    private void requireStatus(Status expected, String action) {
        if (status != expected) {
            throw new IllegalStateException("cannot " + action + " a " + status + " folio");
        }
    }

    private static void requireCurrency(String currency) {
        if (currency == null || !currency.matches("^[A-Z]{3}$")) {
            throw new IllegalArgumentException("currency must be an ISO 4217 code");
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

    public Type getType() {
        return type;
    }

    public Status getStatus() {
        return status;
    }

    public Reservation getReservation() {
        return reservation;
    }

    public ReservationStay getStay() {
        return stay;
    }

    public String getCurrency() {
        return currency;
    }

    public String getHolderLabel() {
        return holderLabel;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
