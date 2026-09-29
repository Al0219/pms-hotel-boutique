package com.pms.hotelboutique.backend.modules.securityauth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {
    @Id
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private AuthSession session;
    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;
    @Column(name = "family_id", nullable = false)
    private UUID familyId;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    @Column(name = "revoked_at")
    private Instant revokedAt;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected RefreshToken() { }

    public RefreshToken(UUID id, AuthSession session, String tokenHash, UUID familyId, Instant expiresAt, Instant now) {
        this.id = id;
        this.session = session;
        this.tokenHash = tokenHash;
        this.familyId = familyId;
        this.expiresAt = expiresAt;
        this.createdAt = now;
    }

    public AuthSession getSession() { return session; }
    public UUID getFamilyId() { return familyId; }
    public boolean isActive(Instant now) { return revokedAt == null && expiresAt.isAfter(now); }
    public void revoke(Instant now) { revokedAt = now; }
}
