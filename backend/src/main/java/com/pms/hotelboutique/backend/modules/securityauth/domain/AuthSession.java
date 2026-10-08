package com.pms.hotelboutique.backend.modules.securityauth.domain;

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

@Entity
@Table(name = "auth_sessions")
public class AuthSession {
    public enum Status { ACTIVE, REVOKED }

    @Id
    private UUID id;
    @Column(nullable = false, updatable = false)
    private String context;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_user_id", nullable = false)
    private StaffUser staffUser;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    @Column(name = "revoked_at")
    private Instant revokedAt;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected AuthSession() { }

    public AuthSession(UUID id, StaffUser staffUser, Instant expiresAt, Instant now) {
        this.id = id;
        this.context = "STAFF";
        this.staffUser = staffUser;
        this.expiresAt = expiresAt;
        this.createdAt = now;
        this.status = Status.ACTIVE;
    }

    public UUID getId() { return id; }
    public StaffUser getStaffUser() { return staffUser; }
    public boolean isActive(Instant now) { return status == Status.ACTIVE && expiresAt.isAfter(now); }
    public void revoke(Instant now) { status = Status.REVOKED; revokedAt = now; }
}
