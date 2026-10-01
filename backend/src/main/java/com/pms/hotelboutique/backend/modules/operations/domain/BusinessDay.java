package com.pms.hotelboutique.backend.modules.operations.domain;

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
 * BD3 hotel business day per property.
 *
 * Exactly one OPEN day exists per property (partial unique index). Closing
 * advances the date by one local day and opens its successor atomically.
 * Timezone-aware day boundaries are a documented refinement; dates are
 * plain local days like BD2's outage periods.
 */
@Entity
@Table(name = "business_days")
public class BusinessDay {

    public enum Status {
        OPEN,
        CLOSED
    }

    @Id
    private UUID id;

    @Column(name = "property_id", nullable = false)
    private UUID propertyId;

    @Column(name = "business_date", nullable = false)
    private LocalDate businessDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(name = "closed_by")
    private UUID closedBy;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected BusinessDay() {
    }

    public BusinessDay(UUID id, UUID propertyId, LocalDate businessDate, Instant now) {
        if (id == null) {
            throw new IllegalArgumentException("id is required");
        }
        if (propertyId == null) {
            throw new IllegalArgumentException("propertyId is required");
        }
        if (businessDate == null) {
            throw new IllegalArgumentException("businessDate is required");
        }
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.id = id;
        this.propertyId = propertyId;
        this.businessDate = businessDate;
        this.status = Status.OPEN;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void close(UUID actorId, Instant now) {
        if (status != Status.OPEN) {
            throw new IllegalStateException("business day is already closed");
        }
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.status = Status.CLOSED;
        this.closedBy = actorId;
        this.closedAt = now;
        this.updatedAt = now;
    }

    public UUID getId() {
        return id;
    }

    public UUID getPropertyId() {
        return propertyId;
    }

    public LocalDate getBusinessDate() {
        return businessDate;
    }

    public Status getStatus() {
        return status;
    }

    public UUID getClosedBy() {
        return closedBy;
    }

    public Instant getClosedAt() {
        return closedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
