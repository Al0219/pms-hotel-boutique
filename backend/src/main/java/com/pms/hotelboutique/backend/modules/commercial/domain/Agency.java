package com.pms.hotelboutique.backend.modules.commercial.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * BD3 B2B agency base (F12).
 *
 * <p>{@code commissionModel} is a label only in F12 ({@code PERCENT} /
 * {@code FIXED} / null). Commission math must never reduce the guest price
 * (domain rule) and its calculation belongs to a later phase.</p>
 */
@Entity
@Table(name = "agencies")
public class Agency {

    public enum Status {
        ACTIVE,
        INACTIVE
    }

    public enum CommissionModel {
        PERCENT,
        FIXED
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
    @Column(name = "commission_model")
    private CommissionModel commissionModel;

    @Column
    private String email;

    @Column
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Agency() {
    }

    public Agency(UUID id, UUID propertyId, String code, String name, Instant now) {
        if (id == null) {
            throw new IllegalArgumentException("id is required");
        }
        if (propertyId == null) {
            throw new IllegalArgumentException("propertyId is required");
        }
        requireCode(code);
        requireName(name);
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.id = id;
        this.propertyId = propertyId;
        this.code = code.trim();
        this.name = name.trim();
        this.status = Status.ACTIVE;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void updateContact(String name, CommissionModel commissionModel, String email,
            String phone, Instant now) {
        requireName(name);
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.name = name.trim();
        this.commissionModel = commissionModel;
        this.email = blankToNull(email);
        this.phone = blankToNull(phone);
        this.updatedAt = now;
    }

    public void deactivate(Instant now) {
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.status = Status.INACTIVE;
        this.updatedAt = now;
    }

    public void activate(Instant now) {
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.status = Status.ACTIVE;
        this.updatedAt = now;
    }

    public boolean isActive() {
        return status == Status.ACTIVE;
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

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
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

    public CommissionModel getCommissionModel() {
        return commissionModel;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
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
