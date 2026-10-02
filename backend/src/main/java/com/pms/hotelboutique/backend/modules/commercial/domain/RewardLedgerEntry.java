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
 * BD3 reward ledger entry (F14).
 *
 * <p>Append-only: no setters, no lifecycle. Corrections post compensating
 * entries linked via {@code reversesId}. Balance is always derived
 * ({@code SUM(points)}), never stored. Sign convention: {@code EARN} &gt; 0,
 * {@code REDEEM}/{@code EXPIRE} &lt; 0, {@code REVERSE} negates the original.
 * Database trigger {@code trg_reward_ledger_append_only} rejects UPDATE/DELETE.</p>
 */
@Entity
@Table(name = "reward_ledger")
public class RewardLedgerEntry {

    public enum Kind {
        EARN,
        REDEEM,
        EXPIRE,
        REVERSE
    }

    @Id
    private UUID id;

    @Column(name = "guest_profile_id", nullable = false)
    private UUID guestProfileId;

    /**
     * Raw id on purpose: BD1 owns the properties table and exposes no JPA
     * read model to reuse. Existence is enforced by the FK.
     */
    @Column(name = "property_id", nullable = false)
    private UUID propertyId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Kind kind;

    @Column(nullable = false)
    private long points;

    @Column(name = "stay_id")
    private UUID stayId;

    @Column(name = "reverses_id")
    private UUID reversesId;

    @Column(nullable = false)
    private String reason;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected RewardLedgerEntry() {
    }

    public RewardLedgerEntry(UUID id, UUID guestProfileId, UUID propertyId, Kind kind,
            long points, UUID stayId, UUID reversesId, String reason, UUID createdBy,
            Instant now) {
        if (id == null) {
            throw new IllegalArgumentException("id is required");
        }
        if (guestProfileId == null) {
            throw new IllegalArgumentException("guestProfileId is required");
        }
        if (propertyId == null) {
            throw new IllegalArgumentException("propertyId is required");
        }
        if (kind == null) {
            throw new IllegalArgumentException("kind is required");
        }
        if (points == 0) {
            throw new IllegalArgumentException("points must not be zero");
        }
        if (kind == Kind.EARN && stayId == null) {
            throw new IllegalArgumentException("EARN requires a stay");
        }
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("reason must not be blank");
        }
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.id = id;
        this.guestProfileId = guestProfileId;
        this.propertyId = propertyId;
        this.kind = kind;
        this.points = points;
        this.stayId = stayId;
        this.reversesId = reversesId;
        this.reason = reason.trim();
        this.createdBy = createdBy;
        this.createdAt = now;
    }

    public UUID getId() {
        return id;
    }

    public UUID getGuestProfileId() {
        return guestProfileId;
    }

    public UUID getPropertyId() {
        return propertyId;
    }

    public Kind getKind() {
        return kind;
    }

    public long getPoints() {
        return points;
    }

    public UUID getStayId() {
        return stayId;
    }

    public UUID getReversesId() {
        return reversesId;
    }

    public String getReason() {
        return reason;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
