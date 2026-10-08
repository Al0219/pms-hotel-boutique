package com.pms.hotelboutique.backend.modules.guestauth.application;

import com.pms.hotelboutique.backend.modules.guestauth.application.ReservationLinkVerificationPort.LinkCandidate;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.email.EmailSender;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Executor;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/** Guest-only OTP link workflow. Email delivery occurs after challenge insertion commits. */
@Service
public class ReservationLinkOtpService {
    private static final Duration TTL = Duration.ofMinutes(10);
    private static final Duration RESEND_GAP = Duration.ofSeconds(60);
    private static final Duration HOUR = Duration.ofHours(1);
    private static final Duration DAY = Duration.ofDays(1);
    private static final int MAX_PER_CODE_HOUR = 3;
    private static final int MAX_PER_ACCOUNT_DAY = 10;
    private static final int MAX_ATTEMPTS = 5;

    private final GuestAuthService auth;
    private final ReservationLinkVerificationPort reservations;
    private final EmailSender email;
    private final Executor deliveryExecutor;
    private final JdbcClient jdbc;
    private final AuditService audit;
    private final TransactionTemplate transactions;
    private final byte[] hmacKey;
    private final SecureRandom random = new SecureRandom();

    public ReservationLinkOtpService(GuestAuthService auth, ReservationLinkVerificationPort reservations,
            EmailSender email, @Qualifier("otpDeliveryExecutor") Executor deliveryExecutor,
            JdbcClient jdbc, AuditService audit, PlatformTransactionManager manager,
            @Value("${pms.security.reservation-link-otp-hmac-key:}") String hmacKey) {
        this.auth = auth;
        this.reservations = reservations;
        this.email = email;
        this.deliveryExecutor = deliveryExecutor;
        this.jdbc = jdbc;
        this.audit = audit;
        this.transactions = new TransactionTemplate(manager);
        this.transactions.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.hmacKey = hmacKey.getBytes(StandardCharsets.UTF_8);
    }

    /** Always returns an opaque ID for a well-formed request, including unknown reservations. */
    public UUID issue(GuestPrincipal principal, String confirmationCode) {
        GuestPrincipal active = active(principal);
        if (confirmationCode == null || confirmationCode.isBlank() || confirmationCode.length() > 16) {
            throw new IllegalArgumentException("confirmationCode must contain 1 to 16 characters");
        }
        requireConfigured();
        String code = confirmationCode.trim();
        String fingerprint = hmac("reference:" + code);
        UUID requestId = UUID.randomUUID();
        Instant now = Instant.now();
        Optional<LinkCandidate> candidate = reservations.findCandidate(code, active.email());
        String otp = String.format("%08d", random.nextInt(100_000_000));
        boolean willSend = Boolean.TRUE.equals(transactions.execute(status -> {
            lockActive(active);
            long codeHour = count("confirmation_fingerprint=:fingerprint AND issued_at>=:since",
                    active.guestAccountId(), fingerprint, now.minus(HOUR));
            long accountDay = count("issued_at>=:since", active.guestAccountId(),
                    fingerprint, now.minus(DAY));
            boolean cooldown = jdbc.sql("""
                    SELECT EXISTS (SELECT 1 FROM reservation_link_challenges
                      WHERE guest_account_id=:accountId AND confirmation_fingerprint=:fingerprint
                        AND last_sent_at>:cutoff)
                    """).param("accountId", active.guestAccountId())
                    .param("fingerprint", fingerprint).param("cutoff", sqlTime(now.minus(RESEND_GAP)))
                    .query(Boolean.class).single();
            if (codeHour >= MAX_PER_CODE_HOUR || accountDay >= MAX_PER_ACCOUNT_DAY || cooldown) {
                return false;
            }
            LinkCandidate link = candidate.orElse(null);
            if (link != null && alreadyLinked(link.reservationId())) {
                link = null;
            }
            if (link != null) {
                jdbc.sql("""
                        UPDATE reservation_link_challenges SET status='EXPIRED'
                        WHERE guest_account_id=:accountId AND reservation_id=:reservationId
                          AND status IN ('PENDING_SEND','READY')
                        """).param("accountId", active.guestAccountId())
                        .param("reservationId", link.reservationId()).update();
            }
            jdbc.sql("""
                    INSERT INTO reservation_link_challenges
                      (id,guest_account_id,guest_session_id,reservation_id,property_id,
                       booking_guest_profile_id,confirmation_fingerprint,otp_hash,status,
                       attempt_count,issued_at,expires_at,last_sent_at)
                    VALUES (:id,:accountId,:sessionId,:reservationId,:propertyId,:profileId,
                            :fingerprint,:otpHash,:status,0,:issuedAt,:expiresAt,:lastSentAt)
                    """).param("id", requestId).param("accountId", active.guestAccountId())
                    .param("sessionId", active.sessionId())
                    .param("reservationId", link == null ? null : link.reservationId())
                    .param("propertyId", link == null ? null : link.propertyId())
                    .param("profileId", link == null ? null : link.bookingGuestProfileId())
                    .param("fingerprint", fingerprint)
                    .param("otpHash", link == null ? null : hmac("otp:" + requestId + ":" + otp))
                    .param("status", link == null ? "INVALID" : "PENDING_SEND")
                    .param("issuedAt", sqlTime(now)).param("expiresAt", sqlTime(now.plus(TTL)))
                    .param("lastSentAt", link == null ? null : sqlTime(now)).update();
            auditAuth("GUEST_LINK_CHALLENGE_REQUESTED", active, now);
            return link != null;
        }));
        if (willSend) {
            try {
                // A bounded executor keeps the 202 response independent of provider latency.
                deliveryExecutor.execute(() -> deliver(requestId, active,
                        candidate.orElseThrow().recipientEmail(), otp));
            } catch (RuntimeException schedulingFailure) {
                markDelivery(requestId, active, "UNKNOWN", "GUEST_LINK_OTP_UNCERTAIN");
            }
        }
        return requestId;
    }

    private void deliver(UUID requestId, GuestPrincipal active, String recipient, String otp) {
        try {
            // Only the reservation's contact address can receive the OTP.
            email.sendReservationLinkOtp(recipient, otp);
            markDelivery(requestId, active, "READY", "GUEST_LINK_OTP_SENT");
        } catch (RuntimeException deliveryFailure) {
            markDelivery(requestId, active, "UNKNOWN", "GUEST_LINK_OTP_UNCERTAIN");
        }
    }

    /** False is intentionally generic for unknown, expired, wrong and exhausted codes. */
    public boolean verify(GuestPrincipal principal, UUID requestId, String otp) {
        GuestPrincipal active = active(principal);
        if (requestId == null || otp == null || !otp.matches("[0-9]{8}")) {
            return false;
        }
        requireConfigured();
        return Boolean.TRUE.equals(transactions.execute(status -> {
            lockActive(active);
            Challenge challenge = jdbc.sql("""
                    SELECT id,reservation_id,property_id,booking_guest_profile_id,otp_hash,status,
                           attempt_count,expires_at
                    FROM reservation_link_challenges
                    WHERE id=:id AND guest_account_id=:accountId AND guest_session_id=:sessionId
                    FOR UPDATE
                    """).param("id", requestId).param("accountId", active.guestAccountId())
                    .param("sessionId", active.sessionId())
                    .query((rs, rowNum) -> new Challenge(
                            rs.getObject("reservation_id", UUID.class),
                            rs.getObject("property_id", UUID.class),
                            rs.getObject("booking_guest_profile_id", UUID.class),
                            rs.getString("otp_hash"), rs.getString("status"),
                            rs.getInt("attempt_count"), rs.getTimestamp("expires_at").toInstant()))
                    .optional().orElse(null);
            if (challenge == null || !"READY".equals(challenge.state())) {
                return false;
            }
            Instant now = Instant.now();
            if (!challenge.expiresAt().isAfter(now)) {
                setStatus(requestId, "EXPIRED");
                return false;
            }
            if (challenge.attempts() >= MAX_ATTEMPTS) {
                setStatus(requestId, "LOCKED");
                return false;
            }
            if (!MessageDigest.isEqual(challenge.otpHash().getBytes(StandardCharsets.US_ASCII),
                    hmac("otp:" + requestId + ":" + otp).getBytes(StandardCharsets.US_ASCII))) {
                int attempts = challenge.attempts() + 1;
                jdbc.sql("UPDATE reservation_link_challenges SET attempt_count=:attempts,status=:state WHERE id=:id")
                        .param("attempts", attempts)
                        .param("state", attempts == MAX_ATTEMPTS ? "LOCKED" : "READY")
                        .param("id", requestId).update();
                auditAuth("GUEST_LINK_OTP_DENIED", active, now);
                return false;
            }
            boolean stillEligible = jdbc.sql("""
                    SELECT EXISTS (SELECT 1 FROM reservations r
                      JOIN guest_profiles g ON g.id=r.booking_guest_id
                      WHERE r.id=:reservationId AND r.property_id=:propertyId
                        AND g.id=:profileId AND lower(trim(g.email))=lower(trim(:email)))
                    """).param("reservationId", challenge.reservationId())
                    .param("propertyId", challenge.propertyId())
                    .param("profileId", challenge.bookingGuestProfileId())
                    .param("email", active.email()).query(Boolean.class).single();
            if (!stillEligible) {
                setStatus(requestId, "LOCKED");
                return false;
            }
            int inserted = jdbc.sql("""
                    INSERT INTO guest_reservation_links
                      (reservation_id,guest_account_id,property_id,challenge_id,linked_at)
                    VALUES (:reservationId,:accountId,:propertyId,:challengeId,:linkedAt)
                    ON CONFLICT (reservation_id) DO NOTHING
                    """).param("reservationId", challenge.reservationId())
                    .param("accountId", active.guestAccountId())
                    .param("propertyId", challenge.propertyId())
                    .param("challengeId", requestId).param("linkedAt", sqlTime(now)).update();
            UUID owner = jdbc.sql("SELECT guest_account_id FROM guest_reservation_links WHERE reservation_id=:id")
                    .param("id", challenge.reservationId()).query(UUID.class).single();
            if (!owner.equals(active.guestAccountId())) {
                setStatus(requestId, "LOCKED");
                return false;
            }
            jdbc.sql("UPDATE reservation_link_challenges SET status='CONSUMED',consumed_at=:now WHERE id=:id")
                    .param("id", requestId).param("now", sqlTime(now)).update();
            auditAuth("GUEST_LINK_OTP_VERIFIED", active, now);
            if (inserted == 1) {
                audit.record(new AuditService.RecordAuditCommand(ReservationAuditEvent.ActorType.GUEST,
                        active.guestAccountId(), "GUEST_RESERVATION_LINKED", "RESERVATION",
                        challenge.reservationId(), challenge.propertyId(), null, null, null,
                        requestId));
            }
            return true;
        }));
    }

    private GuestPrincipal active(GuestPrincipal principal) {
        if (principal == null) {
            throw new GuestAuthenticationException();
        }
        return auth.getActivePrincipal(principal);
    }

    private void lockActive(GuestPrincipal active) {
        jdbc.sql("SELECT id FROM guest_accounts WHERE id=:id AND status='ACTIVE' FOR UPDATE")
                .param("id", active.guestAccountId()).query(UUID.class).optional()
                .orElseThrow(GuestAuthenticationException::new);
        jdbc.sql("""
                SELECT id FROM guest_auth_sessions
                WHERE id=:sessionId AND guest_account_id=:accountId
                  AND status='ACTIVE' AND expires_at>now() FOR SHARE
                """).param("sessionId", active.sessionId()).param("accountId", active.guestAccountId())
                .query(UUID.class).optional().orElseThrow(GuestAuthenticationException::new);
    }

    private long count(String predicate, UUID accountId, String fingerprint, Instant since) {
        return jdbc.sql("SELECT count(*) FROM reservation_link_challenges WHERE guest_account_id=:accountId AND "
                        + predicate)
                .param("accountId", accountId).param("fingerprint", fingerprint)
                .param("since", sqlTime(since)).query(Long.class).single();
    }

    private boolean alreadyLinked(UUID reservationId) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM guest_reservation_links WHERE reservation_id=:id)")
                .param("id", reservationId).query(Boolean.class).single();
    }

    private void markDelivery(UUID requestId, GuestPrincipal active, String state, String eventType) {
        transactions.executeWithoutResult(status -> {
            jdbc.sql("UPDATE reservation_link_challenges SET status=:state WHERE id=:id AND status='PENDING_SEND'")
                    .param("state", state).param("id", requestId).update();
            auditAuth(eventType, active, Instant.now());
        });
    }

    private void setStatus(UUID requestId, String state) {
        jdbc.sql("UPDATE reservation_link_challenges SET status=:state WHERE id=:id")
                .param("state", state).param("id", requestId).update();
    }

    private void auditAuth(String eventType, GuestPrincipal principal, Instant now) {
        jdbc.sql("""
                INSERT INTO guest_auth_audit_events
                  (id,event_type,guest_account_id,session_id,occurred_at,detail)
                VALUES (:id,:eventType,:accountId,:sessionId,:occurredAt,'Reservation link verification')
                """).param("id", UUID.randomUUID()).param("eventType", eventType)
                .param("accountId", principal.guestAccountId()).param("sessionId", principal.sessionId())
                .param("occurredAt", sqlTime(now)).update();
    }

    private void requireConfigured() {
        if (hmacKey.length < 32) {
            throw new IllegalStateException("Reservation OTP HMAC key must be configured");
        }
    }

    private String hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(hmacKey, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Unable to calculate reservation OTP verifier", e);
        }
    }

    private OffsetDateTime sqlTime(Instant time) {
        return time.atOffset(ZoneOffset.UTC);
    }

    private record Challenge(UUID reservationId, UUID propertyId, UUID bookingGuestProfileId,
            String otpHash, String state, int attempts, Instant expiresAt) { }
}
