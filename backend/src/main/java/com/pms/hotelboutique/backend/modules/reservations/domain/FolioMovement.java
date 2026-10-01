package com.pms.hotelboutique.backend.modules.reservations.domain;

import com.pms.hotelboutique.backend.shared.money.MinorUnits;
import com.pms.hotelboutique.backend.shared.money.MonetaryAmount;
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
import java.util.Currency;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * BD3 immutable financial movement.
 *
 * Instances are write-once: no setters, no status, no update timestamp.
 * Corrections happen only through new compensating movements (see
 * {@code reverses}). The database trigger rejects UPDATE and DELETE as a
 * second line of defense.
 */
@Entity
@Table(name = "folio_movements")
public class FolioMovement {

    public enum Kind {
        CHARGE,
        PAYMENT,
        ADJUSTMENT
    }

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folio_id", nullable = false)
    private Folio folio;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Kind kind;

    @Column(name = "amount_minor", nullable = false)
    private long amountMinor;

    @Column(nullable = false, columnDefinition = "CHAR(3)")
    @JdbcTypeCode(SqlTypes.CHAR)
    private String currency;

    @Column(nullable = false)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reverses_id")
    private FolioMovement reverses;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected FolioMovement() {
    }

    public FolioMovement(UUID id, Folio folio, Kind kind, MonetaryAmount amount, String description,
            FolioMovement reverses, UUID createdBy, Instant now) {
        if (id == null) {
            throw new IllegalArgumentException("id is required");
        }
        if (folio == null) {
            throw new IllegalArgumentException("folio is required");
        }
        if (kind == null) {
            throw new IllegalArgumentException("kind is required");
        }
        if (amount == null) {
            throw new IllegalArgumentException("amount is required");
        }
        if (amount.minorUnits().value() == 0) {
            throw new IllegalArgumentException("amount must not be zero");
        }
        if (!folio.getCurrency().equals(amount.currency().getCurrencyCode())) {
            throw new IllegalArgumentException("movement currency must match the folio currency");
        }
        if (description == null || description.isBlank()) {
            throw new IllegalArgumentException("description must not be blank");
        }
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.id = id;
        this.folio = folio;
        this.kind = kind;
        this.amountMinor = amount.minorUnits().value();
        this.currency = amount.currency().getCurrencyCode();
        this.description = description.trim();
        this.reverses = reverses;
        this.createdBy = createdBy;
        this.createdAt = now;
    }

    public MonetaryAmount amount() {
        return new MonetaryAmount(new MinorUnits(amountMinor), Currency.getInstance(currency));
    }

    public UUID getId() {
        return id;
    }

    public Folio getFolio() {
        return folio;
    }

    public Kind getKind() {
        return kind;
    }

    public long getAmountMinor() {
        return amountMinor;
    }

    public String getCurrency() {
        return currency;
    }

    public String getDescription() {
        return description;
    }

    public FolioMovement getReverses() {
        return reverses;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
