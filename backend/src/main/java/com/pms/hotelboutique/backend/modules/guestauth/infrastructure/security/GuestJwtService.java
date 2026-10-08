package com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security;
import com.pms.hotelboutique.backend.modules.guestauth.application.*; import io.jsonwebtoken.*; import io.jsonwebtoken.security.Keys; import java.security.SecureRandom; import java.time.*; import java.util.*; import javax.crypto.SecretKey; import org.springframework.beans.factory.annotation.Value; import org.springframework.stereotype.Service;
@Service public class GuestJwtService {
 private final SecretKey key; private final Duration ttl;
 public GuestJwtService(@Value("${pms.security.jwt-secret:}") String secret,@Value("${pms.security.access-token-ttl:PT15M}") Duration ttl){this.ttl=ttl; key=secret==null||secret.isBlank()?ephemeral():Keys.hmacShaKeyFor(Base64.getDecoder().decode(secret));}
 public String issue(GuestPrincipal p,Instant now){return Jwts.builder().issuer("pms-hotel-boutique").audience().add("pms-guest").and().id(UUID.randomUUID().toString()).subject(p.guestAccountId().toString()).claim("ctx","GUEST").claim("sid",p.sessionId().toString()).issuedAt(Date.from(now)).expiration(Date.from(now.plus(ttl))).signWith(key).compact();}
 public GuestPrincipal parse(String token){Claims c=Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload(); if(!"pms-hotel-boutique".equals(c.getIssuer())||!c.getAudience().contains("pms-guest")||!"GUEST".equals(c.get("ctx",String.class)))throw new GuestAuthenticationException(); return new GuestPrincipal(UUID.fromString(c.getSubject()),UUID.fromString(c.get("sid",String.class)),null);}
 public long accessTokenExpiresInSeconds(){return ttl.toSeconds();} private SecretKey ephemeral(){byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);return Keys.hmacShaKeyFor(bytes);}
}
