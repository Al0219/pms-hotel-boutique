package com.pms.hotelboutique.backend.modules.securityauth.application;

import com.pms.hotelboutique.backend.modules.securityauth.domain.AuthAuditEvent;
import com.pms.hotelboutique.backend.modules.securityauth.domain.AuthSession;
import com.pms.hotelboutique.backend.modules.securityauth.domain.RefreshToken;
import com.pms.hotelboutique.backend.modules.securityauth.domain.StaffUser;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.AuthAuditEventRepository;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.AuthSessionRepository;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.RefreshTokenRepository;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.StaffUserRepository;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import com.pms.hotelboutique.backend.infrastructure.security.PasswordLoginValidator;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.StaffSecurityLocks;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class StaffAuthServiceImpl implements StaffAuthService {
    @PersistenceContext private EntityManager entityManager;
    private final StaffSecurityLocks locks;
    private final PasswordLoginValidator loginInputs;
    private final StaffUserRepository staffUsers;
    private final AuthSessionRepository sessions;
    private final RefreshTokenRepository refreshTokens;
    private final AuthAuditEventRepository auditEvents;
    private final PasswordEncoder passwordEncoder;
    private final StaffJwtService jwtService;
    private final StaffAuthorizationService authorizationService;
    private final Duration refreshTokenTtl;
    private final String dummyHash;
    private final SecureRandom secureRandom = new SecureRandom();

    public StaffAuthServiceImpl(StaffUserRepository staffUsers, AuthSessionRepository sessions,
            RefreshTokenRepository refreshTokens, AuthAuditEventRepository auditEvents,
            PasswordEncoder passwordEncoder, StaffJwtService jwtService, StaffAuthorizationService authorizationService,
            @Value("${pms.security.refresh-token-ttl:P7D}") Duration refreshTokenTtl, PasswordLoginValidator loginInputs, StaffSecurityLocks locks) {
        this.locks = locks;
        this.loginInputs = loginInputs;
        this.staffUsers = staffUsers;
        this.sessions = sessions;
        this.refreshTokens = refreshTokens;
        this.auditEvents = auditEvents;
        this.passwordEncoder = passwordEncoder;
        this.dummyHash = passwordEncoder.encode(UUID.randomUUID().toString());
        this.jwtService = jwtService;
        this.authorizationService = authorizationService;
        this.refreshTokenTtl = refreshTokenTtl;
    }

    @Override
    public StaffTokenPair login(String email, String password) {
        String normalizedEmail = loginInputs.normalizedEmail(email, password);
        Instant now = Instant.now();
        StaffUser user = staffUsers.findByNormalizedEmail(normalizedEmail).orElse(null);
        if (user != null) {
            locks.users(List.of(user.getId()));
            refreshEntity(user);
        }
        boolean matched = passwordEncoder.matches(password, user == null ? dummyHash : user.getPasswordHash());
        if (user == null) throw new StaffAuthenticationException();
        // Lookup may precede a concurrent email change. Never authenticate the old identifier.
        if (!normalizedEmail.equals(user.getWorkEmail().trim().toLowerCase(java.util.Locale.ROOT))) throw new StaffAuthenticationException();
        if (!matched || !user.isActive()) {
            auditEvents.save(new AuthAuditEvent("STAFF_LOGIN_FAILED", user.getId(), null, "invalid_credentials", now));
            throw new StaffAuthenticationException();
        }
        authorizationService.resolve(user.getId());
        AuthSession session = sessions.save(new AuthSession(UUID.randomUUID(), user, now.plus(refreshTokenTtl), now));
        StaffTokenPair tokens = createTokenPair(session, UUID.randomUUID(), now);
        auditEvents.save(AuthAuditEvent.staffAction("STAFF_LOGIN_SUCCEEDED", user.getId(), session.getId(), "password", now, user.getId()));
        return tokens;
    }

    @Override
    @Transactional(noRollbackFor = StaffAuthenticationException.class)
    public StaffTokenPair refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new StaffAuthenticationException();
        }
        Instant now = Instant.now();
        RefreshToken current = refreshTokens.findByTokenHash(hash(rawRefreshToken)).orElseThrow(StaffAuthenticationException::new);
        AuthSession session = current.getSession();
        locks.users(List.of(session.getStaffUser().getId()));
        locks.sessionsAndTokens(session.getStaffUser().getId());
        refreshEntity(session.getStaffUser());
        refreshEntity(session);
        refreshEntity(current);
        now = Instant.now();
        if (!current.isActive(now) || !session.isActive(now) || !session.getStaffUser().isActive()) {
            revokeSession(session, now, "refresh_rejected", null);
            throw new StaffAuthenticationException();
        }
        try { authorizationService.resolve(session.getStaffUser().getId()); }
        catch (StaffAuthenticationException denied) {
            revokeSession(session, now, "refresh_rejected", null);
            throw denied;
        }
        current.revoke(now);
        StaffTokenPair tokens = createTokenPair(session, current.getFamilyId(), now);
        auditEvents.save(AuthAuditEvent.staffAction("STAFF_REFRESH_ROTATED", session.getStaffUser().getId(), session.getId(), "rotated", now, session.getStaffUser().getId()));
        return tokens;
    }

    @Override
    @Transactional(readOnly = true)
    public StaffPrincipal getActivePrincipal(StaffPrincipal principal) {
        Instant now = Instant.now();
        // Preserve callers joining an existing write transaction (including newly-created sessions).
        entityManager.flush();
        AuthSession session = sessions.findById(principal.sessionId()).orElseThrow(StaffAuthenticationException::new);
        StaffUser user = session.getStaffUser();
        refreshEntity(session);
        refreshEntity(user);
        if (!session.isActive(now) || !user.isActive() || !user.getId().equals(principal.staffUserId())) {
            throw new StaffAuthenticationException();
        }
        StaffAuthorizationSnapshot snapshot = authorizationService.resolve(user.getId());
        return new StaffPrincipal(user.getId(), session.getId(), user.getUsername(), snapshot.roleCode());
    }

    @Override
    public void logout(StaffPrincipal principal) {
        locks.users(List.of(principal.staffUserId()));
        locks.sessionsAndTokens(principal.staffUserId());
        StaffPrincipal active = getActivePrincipal(principal);
        AuthSession session = sessions.findById(active.sessionId()).orElseThrow(StaffAuthenticationException::new);
        revokeSession(session, Instant.now(), "logout", active.staffUserId());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean acceptsCredentials(String email, String password) {
        StaffUser user = staffUsers.findByNormalizedEmail(loginInputs.normalizedEmail(email, password)).orElse(null);
        boolean matched = passwordEncoder.matches(password, user == null ? dummyHash : user.getPasswordHash());
        if (!matched || user == null || !user.isActive()) return false;
        try { authorizationService.resolve(user.getId()); return true; }
        catch (StaffAuthenticationException invalidAuthorization) { return false; }
    }

    private StaffTokenPair createTokenPair(AuthSession session, UUID familyId, Instant now) {
        String rawRefreshToken = newRefreshToken();
        refreshTokens.save(new RefreshToken(UUID.randomUUID(), session, hash(rawRefreshToken), familyId,
                now.plus(refreshTokenTtl), now));
        StaffUser user = session.getStaffUser();
        StaffAuthorizationSnapshot snapshot = authorizationService.resolve(user.getId());
        StaffPrincipal principal = new StaffPrincipal(user.getId(), session.getId(), user.getUsername(), snapshot.roleCode());
        return new StaffTokenPair(jwtService.issue(principal, now), rawRefreshToken, jwtService.accessTokenExpiresInSeconds());
    }

    private void revokeSession(AuthSession session, Instant now, String detail, UUID authenticatedActorId) {
        boolean changed = !session.isRevoked();
        if (changed) session.revoke(now);
        List<RefreshToken> tokens = refreshTokens.findAllBySession_Id(session.getId());
        for (RefreshToken token : tokens) {
            if (!token.isRevoked()) { token.revoke(now); changed = true; }
        }
        // A rejected request on an already-revoked family is not another revocation fact.
        if (!changed) return;
        AuthAuditEvent event = authenticatedActorId == null
                ? new AuthAuditEvent("STAFF_SESSION_REVOKED", session.getStaffUser().getId(), session.getId(), detail, now)
                : AuthAuditEvent.staffAction("STAFF_SESSION_REVOKED", session.getStaffUser().getId(), session.getId(),
                        detail, now, authenticatedActorId);
        auditEvents.save(event);
    }

    private void refreshEntity(Object entity) {
        try { entityManager.refresh(entity); }
        catch (jakarta.persistence.EntityNotFoundException absent) { throw new StaffAuthenticationException(); }
    }

    private String newRefreshToken() {
        byte[] bytes = new byte[48];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is required", exception);
        }
    }
}
