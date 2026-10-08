package com.pms.hotelboutique.backend.modules.guestauth.domain;
import jakarta.persistence.*; import java.time.Instant; import java.util.UUID;
@Entity @Table(name="guest_oidc_transactions") public class GuestOidcTransaction {
 @Id private UUID id; @Column(name="state_hash",nullable=false,unique=true) private String stateHash; @Column(nullable=false) private String nonce; @Column(name="pkce_verifier",nullable=false) private String pkceVerifier; @Column(name="expires_at",nullable=false) private Instant expiresAt; @Column(name="used_at") private Instant usedAt; @Column(name="created_at",nullable=false) private Instant createdAt;
 protected GuestOidcTransaction(){} public GuestOidcTransaction(UUID id,String hash,String nonce,String verifier,Instant expires,Instant now){this.id=id;stateHash=hash;this.nonce=nonce;pkceVerifier=verifier;expiresAt=expires;createdAt=now;}
 public String getNonce(){return nonce;} public String getPkceVerifier(){return pkceVerifier;} public boolean isUsable(Instant now){return usedAt==null&&expiresAt.isAfter(now);} public void use(Instant now){usedAt=now;}
}
