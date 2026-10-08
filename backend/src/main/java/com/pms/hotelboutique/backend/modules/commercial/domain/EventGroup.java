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
 * BD3 group/event header (F13).
 *
 * <p>Lifecycle is strictly sequential:
 * {@code INQUIRY -> TENTATIVE -> DEFINITE -> IN_HOUSE -> CLOSED}.
 * Skips and backward moves are rejected. Cutoff/release behavior and billing
 * belong to later phases; this base only stores the commercial dates.</p>
 */
@Entity
@Table(name = "event_groups")
public class EventGroup {

    public enum Status {
        INQUIRY,
        TENTATIVE,
        DEFINITE,
        IN_HOUSE,
        CLOSED
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

    @Column(name = "company_id")
    private UUID companyId;

    @Column(name = "agency_id")
    private UUID agencyId;

    @Column(nullable = false)
    private LocalDate arrival;

    @Column(nullable = false)
    private LocalDate departure;

    @Column(name = "cutoff_date")
    private LocalDate cutoffDate;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected EventGroup() {
    }

    public EventGroup(UUID id, UUID propertyId, String code, String name,
            LocalDate arrival, LocalDate departure, Instant now) {
        if (id == null) {
            throw new IllegalArgumentException("id is required");
        }
        if (propertyId == null) {
            throw new IllegalArgumentException("propertyId is required");
        }
        requireCode(code);
        requireName(name);
        requirePeriod(arrival, departure);
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.id = id;
        this.propertyId = propertyId;
        this.code = code.trim();
        this.name = name.trim();
        this.arrival = arrival;
        this.departure = departure;
        this.status = Status.INQUIRY;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void updateDetails(String name, UUID companyId, UUID agencyId,
            LocalDate cutoffDate, Instant now) {
        requireName(name);
        if (cutoffDate != null && cutoffDate.isAfter(arrival)) {
            throw new IllegalArgumentException("cutoff must not be after arrival");
        }
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.name = name.trim();
        this.companyId = companyId;
        this.agencyId = agencyId;
        this.cutoffDate = cutoffDate;
        this.updatedAt = now;
    }

    /**
     * Advances exactly one step of the lifecycle. Skips, backward moves and
     * moves past CLOSED are rejected.
     */
    public void advance(Instant now) {
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        Status[] flow = Status.values();
        int next = status.ordinal() + 1;
        if (next >= flow.length) {
            throw new IllegalStateException("group is already CLOSED");
        }
        this.status = flow[next];
        this.updatedAt = now;
    }

    public boolean isCommerciallyHeld() {
        return status == Status.TENTATIVE || status == Status.DEFINITE;
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

    public UUID getCompanyId() {
        return companyId;
    }

    public UUID getAgencyId() {
        return agencyId;
    }

    public LocalDate getArrival() {
        return arrival;
    }

    public LocalDate getDeparture() {
        return departure;
    }

    public LocalDate getCutoffDate() {
        return cutoffDate;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
