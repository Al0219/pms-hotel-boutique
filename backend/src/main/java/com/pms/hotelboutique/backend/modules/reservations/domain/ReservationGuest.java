package com.pms.hotelboutique.backend.modules.reservations.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * BD3 occupant link between a {@link ReservationStay} and a
 * {@link GuestProfile}.
 *
 * Booking guest and occupants may differ; at most one occupant per stay is
 * flagged primary (enforced by a partial unique index).
 */
@Entity
@Table(name = "reservation_guests")
public class ReservationGuest {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_stay_id", nullable = false)
    private ReservationStay stay;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guest_profile_id", nullable = false)
    private GuestProfile profile;

    @Column(name = "is_primary", nullable = false)
    private boolean primary;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ReservationGuest() {
    }

    public ReservationGuest(UUID id, ReservationStay stay, GuestProfile profile, boolean primary,
            Instant now) {
        if (id == null) {
            throw new IllegalArgumentException("id is required");
        }
        if (stay == null) {
            throw new IllegalArgumentException("stay is required");
        }
        if (profile == null) {
            throw new IllegalArgumentException("profile is required");
        }
        if (now == null) {
            throw new IllegalArgumentException("now is required");
        }
        this.id = id;
        this.stay = stay;
        this.profile = profile;
        this.primary = primary;
        this.createdAt = now;
    }

    public UUID getId() {
        return id;
    }

    public ReservationStay getStay() {
        return stay;
    }

    public GuestProfile getProfile() {
        return profile;
    }

    public boolean isPrimary() {
        return primary;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
