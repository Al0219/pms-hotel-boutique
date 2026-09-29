package com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security;

import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class StaffJwtService {
    private final SecretKey signingKey;
    private final Duration accessTokenTtl;

    public StaffJwtService(
            @Value("${pms.security.jwt-secret:}") String configuredSecret,
            @Value("${pms.security.access-token-ttl:PT15M}") Duration accessTokenTtl) {
        this.accessTokenTtl = accessTokenTtl;
        this.signingKey = configuredSecret == null || configuredSecret.isBlank()
                ? ephemeralKey()
                : Keys.hmacShaKeyFor(Base64.getDecoder().decode(configuredSecret));
    }

    public String issue(StaffPrincipal principal, Instant now) {
        return Jwts.builder()
                .issuer("pms-hotel-boutique")
                .audience().add("pms-staff").and()
                .id(java.util.UUID.randomUUID().toString())
                .subject(principal.staffUserId().toString())
                .claim("ctx", "STAFF")
                .claim("sid", principal.sessionId().toString())
                .claim("usr", principal.username())
                .claim("role", principal.roleCode())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTokenTtl)))
                .signWith(signingKey)
                .compact();
    }

    public StaffPrincipal parse(String token) {
        Claims claims = Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
        if (!"pms-hotel-boutique".equals(claims.getIssuer())
                || !claims.getAudience().contains("pms-staff")
                || !"STAFF".equals(claims.get("ctx", String.class))) {
            throw new StaffAuthenticationException();
        }
        return new StaffPrincipal(
                java.util.UUID.fromString(claims.getSubject()),
                java.util.UUID.fromString(claims.get("sid", String.class)),
                claims.get("usr", String.class),
                claims.get("role", String.class));
    }

    public long accessTokenExpiresInSeconds() { return accessTokenTtl.toSeconds(); }

    private SecretKey ephemeralKey() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Keys.hmacShaKeyFor(bytes);
    }
}
