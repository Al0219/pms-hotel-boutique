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
 * BD3 promotion rule base (F14).
 *
 * <p>A promotion is an eligibility/pricing rule, never a ledger: applying it
 * to a folio belongs to a later phase. {@code benefitValueMinor} holds minor
 * currency units for {@code AMOUNT_OFF} and basis points (100 = 1%, max 10000)
 * for {@code PERCENT_OFF}. Stacking is resolved deterministically by
 * priority (higher wins) and code (tie-break); losers are reported with
 * reason, never silently dropped.</p>
 */
@Entity
@Table(name = "promotions")
public class Promotion {

    public enum Status {
        DRAFT,
        ACTIVE,
        PAUSED,
        EXPIRED
    }

    public enum BenefitType {
        PERCENT_OFF,
        AMOUNT_OFF
    }

    @Id
    private UUID id;

    /**
     * Raw id on purpose: BD1 owns the properties table and exposes no JPA
     * read model to reuse. Existence is enforced by the FK.
     */
    @Column(name = "property_id", nullable = false)
    private UUID propertyId;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(nullable = false)
    private int priority;

    @Column(nullable = false)
    private boolean stackable;

    @Enumerated(EnumType.STRING)
    @Column(name = "benefit_type", nullable = false)
    private BenefitType benefitType;

    @Column(name = "benefit_value_minor", nullable = false)
    private long benefitValueMinor;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Promotion() {
    }

    public Promotion(UUID id, UUID propertyId, String code, String name,
            int priority, boolean stackable, BenefitType benefitType, long benefitValueMinor,
            Instant now) {
        if (id == null) {
            throw new IllegalArgumentException("id is required");
        }
        if (propertyId == null) {
            throw new IllegalArgumentException("propertyId is required");
        }
        requireCode(code);
        requireName(name);
        requireBenefit(benefitType, benefitValueMinor);
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.id = id;
        this.propertyId = propertyId;
        this.code = code.trim();
        this.name = name.trim();
        this.priority = priority;
        this.stackable = stackable;
        this.benefitType = benefitType;
        this.benefitValueMinor = benefitValueMinor;
        this.status = Status.DRAFT;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void updateRule(String name, int priority, boolean stackable,
            LocalDate validFrom, LocalDate validTo, Instant now) {
        requireName(name);
        if (validFrom != null && validTo != null && validFrom.isAfter(validTo)) {
            throw new IllegalArgumentException("validFrom must not be after validTo");
        }
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.name = name.trim();
        this.priority = priority;
        this.stackable = stackable;
        this.validFrom = validFrom;
        this.validTo = validTo;
        this.updatedAt = now;
    }

    public void activate(Instant now) {
        requireTime(now);
        if (status != Status.DRAFT && status != Status.PAUSED) {
            throw new IllegalStateException("only DRAFT or PAUSED promotions can be activated");
        }
        this.status = Status.ACTIVE;
        this.updatedAt = now;
    }

    public void pause(Instant now) {
        requireTime(now);
        if (status != Status.ACTIVE) {
            throw new IllegalStateException("only ACTIVE promotions can be paused");
        }
        this.status = Status.PAUSED;
        this.updatedAt = now;
    }

    public void expire(Instant now) {
        requireTime(now);
        if (status == Status.EXPIRED) {
            throw new IllegalStateException("promotion is already EXPIRED");
        }
        this.status = Status.EXPIRED;
        this.updatedAt = now;
    }

    public boolean isActiveOn(LocalDate date) {
        if (status != Status.ACTIVE || date == null) {
            return false;
        }
        return (validFrom == null || !date.isBefore(validFrom))
                && (validTo == null || !date.isAfter(validTo));
    }

    private static void requireCode(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("code must not be blank");
        }
    }

    private static void requireName(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("name must not be blank");
        }
    }

    private static void requireBenefit(BenefitType type, long value) {
        if (type == null) {
            throw new IllegalArgumentException("benefitType is required");
        }
        if (value <= 0) {
            throw new IllegalArgumentException("benefitValue must be positive");
        }
        if (type == BenefitType.PERCENT_OFF && value > 10000) {
            throw new IllegalArgumentException("percent off must not exceed 10000 basis points");
        }
    }

    private static void requireTime(Instant now) {
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getPropertyId() {
        return propertyId;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public Status getStatus() {
        return status;
    }

    public int getPriority() {
        return priority;
    }

    public boolean isStackable() {
        return stackable;
    }

    public BenefitType getBenefitType() {
        return benefitType;
    }

    public long getBenefitValueMinor() {
        return benefitValueMinor;
    }

    public LocalDate getValidFrom() {
        return validFrom;
    }

    public LocalDate getValidTo() {
        return validTo;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
