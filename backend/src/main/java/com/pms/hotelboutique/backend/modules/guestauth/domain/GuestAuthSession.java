package com.pms.hotelboutique.backend.modules.guestauth.domain;
import jakarta.persistence.*; import java.time.Instant; import java.util.UUID;
@Entity @Table(name="guest_auth_sessions") public class GuestAuthSession {
 public enum Status { ACTIVE, REVOKED }
 @Id private UUID id; @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="guest_account_id",nullable=false) private GuestAccount guestAccount;
 @Enumerated(EnumType.STRING) @Column(nullable=false) private Status status; @Column(name="expires_at",nullable=false) private Instant expiresAt; @Column(name="revoked_at") private Instant revokedAt; @Column(name="created_at",nullable=false) private Instant createdAt;
 protected GuestAuthSession(){} public GuestAuthSession(UUID id,GuestAccount account,Instant expires,Instant now){this.id=id;guestAccount=account;expiresAt=expires;createdAt=now;status=Status.ACTIVE;}
 public UUID getId(){return id;} public GuestAccount getGuestAccount(){return guestAccount;} public boolean isActive(Instant now){return status==Status.ACTIVE&&expiresAt.isAfter(now);} public void revoke(Instant now){status=Status.REVOKED;revokedAt=now;}
}
