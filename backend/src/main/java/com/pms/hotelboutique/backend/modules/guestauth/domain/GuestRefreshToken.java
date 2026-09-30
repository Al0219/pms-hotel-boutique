package com.pms.hotelboutique.backend.modules.guestauth.domain;
import jakarta.persistence.*; import java.time.Instant; import java.util.UUID;
@Entity @Table(name="guest_refresh_tokens") public class GuestRefreshToken {
 @Id private UUID id; @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="session_id",nullable=false) private GuestAuthSession session; @Column(name="token_hash",nullable=false,unique=true) private String tokenHash; @Column(name="family_id",nullable=false) private UUID familyId; @Column(name="expires_at",nullable=false) private Instant expiresAt; @Column(name="revoked_at") private Instant revokedAt; @Column(name="created_at",nullable=false) private Instant createdAt;
 protected GuestRefreshToken(){} public GuestRefreshToken(UUID id,GuestAuthSession session,String hash,UUID family,Instant expires,Instant now){this.id=id;this.session=session;tokenHash=hash;familyId=family;expiresAt=expires;createdAt=now;}
 public GuestAuthSession getSession(){return session;} public UUID getFamilyId(){return familyId;} public boolean isActive(Instant now){return revokedAt==null&&expiresAt.isAfter(now);} public void revoke(Instant now){revokedAt=now;}
}
