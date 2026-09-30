package com.pms.hotelboutique.backend.modules.guestauth.domain;
import jakarta.persistence.*; import java.time.Instant; import java.util.UUID;
@Entity @Table(name="guest_identities") public class GuestIdentity {
 @Id private UUID id; @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="guest_account_id",nullable=false) private GuestAccount guestAccount;
 @Column(nullable=false) private String provider; @Column(name="provider_subject",nullable=false) private String providerSubject; @Column(name="created_at",nullable=false) private Instant createdAt;
 protected GuestIdentity(){} public GuestIdentity(UUID id,GuestAccount account,String provider,String subject,Instant now){this.id=id;guestAccount=account;this.provider=provider;providerSubject=subject;createdAt=now;}
 public GuestAccount getGuestAccount(){return guestAccount;}
}
