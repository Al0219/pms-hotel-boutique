package com.pms.hotelboutique.backend.modules.guestauth;

import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.guestauth.application.ReservationLinkOtpService;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.email.EmailSender;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.security.StaffJwtService;
import com.pms.hotelboutique.backend.modules.reservations.application.CreateGuestProfileCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.CreateReservationCommand;
import com.pms.hotelboutique.backend.modules.reservations.application.GuestProfileService;
import com.pms.hotelboutique.backend.modules.reservations.application.ReservationService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executor;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DataAccessException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "pms.security.reservation-link-otp-hmac-key=test-only-hmac-key-with-at-least-32-bytes",
        "pms.security.jwt-secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="
})
@AutoConfigureMockMvc
class ReservationLinkOtpIntegrationTests {
    private static final UUID PROPERTY = UUID.fromString("3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d");

    @Autowired ReservationLinkOtpService links;
    @Autowired com.pms.hotelboutique.backend.modules.guestauth.application.GuestAccountSummaryService summary;
    @Autowired GuestProfileService profiles;
    @Autowired ReservationService reservations;
    @Autowired JdbcTemplate jdbc;
    @Autowired GuestJwtService jwt;
    @Autowired StaffJwtService staffJwt;
    @Autowired MockMvc mvc;
    @MockitoBean EmailSender sender;
    @MockitoBean(name = "otpDeliveryExecutor") Executor deliveryExecutor;

    private GuestPrincipal guest;
    private String code;
    private UUID reservationId;
    private AtomicReference<String> delivered;
    private List<UUID> reservationsToDelete;
    private List<UUID> profilesToDelete;

    @BeforeEach
    void fixtures() {
        reservationsToDelete = new ArrayList<>();
        profilesToDelete = new ArrayList<>();
        String email = UUID.randomUUID() + "@example.test";
        UUID account = UUID.randomUUID();
        UUID session = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO guest_accounts(id,email,email_verified_at,status,created_at,updated_at)
                VALUES (?,?,now(),'ACTIVE',now(),now())
                """, account, email);
        jdbc.update("""
                INSERT INTO guest_auth_sessions(id,guest_account_id,status,expires_at,created_at)
                VALUES (?,?,'ACTIVE',now()+interval '1 day',now())
                """, session, account);
        guest = new GuestPrincipal(account, session, email);
        var profile = profiles.create(new CreateGuestProfileCommand(null, PROPERTY,
                "Guest", "Test", email, null, null, null, null));
        profilesToDelete.add(profile.id());
        var reservation = reservations.create(new CreateReservationCommand(
                PROPERTY, profile.id(), "GTQ", "WEB_DIRECTA", null, null));
        code = reservation.confirmationCode();
        reservationId = reservation.id();
        reservationsToDelete.add(reservationId);
        delivered = new AtomicReference<>();
        doAnswer(invocation -> {
            ((Runnable) invocation.getArgument(0)).run();
            return null;
        }).when(deliveryExecutor).execute(any(Runnable.class));
        doAnswer(invocation -> {
            delivered.set(invocation.getArgument(1));
            return null;
        }).when(sender).sendReservationLinkOtp(anyString(), anyString());
    }

    @AfterEach
    void removeTestReservations() {
        jdbc.execute("ALTER TABLE guest_reservation_links DISABLE TRIGGER trg_guest_reservation_links_append_only");
        try {
            for (UUID id : reservationsToDelete) {
                jdbc.update("DELETE FROM guest_reservation_links WHERE reservation_id=?", id);
            }
        } finally {
            jdbc.execute("ALTER TABLE guest_reservation_links ENABLE TRIGGER trg_guest_reservation_links_append_only");
        }
        jdbc.update("DELETE FROM reservation_link_challenges WHERE guest_account_id=?", guest.guestAccountId());
        for (UUID id : reservationsToDelete) {
            jdbc.update("DELETE FROM reservations WHERE id=?", id);
        }
        for (UUID id : profilesToDelete) {
            jdbc.update("DELETE FROM guest_profiles WHERE id=?", id);
        }
    }

    @Test
    void issueVerifyAndReplayAreScopedToOneReservationAndSession() {
        UUID request = links.issue(guest, code);
        assertNotNull(request);
        assertNotNull(delivered.get());
        assertEquals(8, delivered.get().length());
        assertEquals(0L, jdbc.queryForObject("SELECT count(*) FROM reservation_link_challenges WHERE id=? AND otp_hash=?",
                Long.class, request, delivered.get()));

        assertTrue(links.verify(guest, request, delivered.get()));
        // Summary reads the durable ownership produced by the real OTP service, not email/profile.
        assertEquals(1, summary.ownSummary(guest).linkedReservationsCount());
        assertTrue(summary.ownSummary(guest).profiles().isEmpty());
        assertFalse(links.verify(guest, request, delivered.get()));
        assertEquals(guest.guestAccountId(), jdbc.queryForObject(
                "SELECT guest_account_id FROM guest_reservation_links WHERE reservation_id=?", UUID.class, reservationId));
        assertEquals(1L, jdbc.queryForObject("SELECT count(*) FROM reservation_audit_events "
                + "WHERE entity_id=? AND action='GUEST_RESERVATION_LINKED'", Long.class, reservationId));

        UUID otherSession = UUID.randomUUID();
        jdbc.update("INSERT INTO guest_auth_sessions(id,guest_account_id,status,expires_at,created_at) "
                + "VALUES (?,?,'ACTIVE',now()+interval '1 day',now())", otherSession, guest.guestAccountId());
        assertFalse(links.verify(new GuestPrincipal(guest.guestAccountId(), otherSession, guest.email()),
                request, delivered.get()));
    }

    @Test
    void unknownReferenceHasGenericRequestAndNoDelivery() {
        UUID request = links.issue(guest, "UNKNOWN123");
        assertNotNull(request);
        verifyNoInteractions(sender);
        assertFalse(links.verify(guest, request, "00000000"));
        assertEquals(0L, jdbc.queryForObject("SELECT count(*) FROM guest_reservation_links "
                + "WHERE reservation_id=?", Long.class, reservationId));
    }

    @Test
    void verifiedAccountEmailMustMatchBookingGuestWithoutTrustingRequestEmail() {
        String anotherEmail = UUID.randomUUID() + "@example.test";
        var otherProfile = profiles.create(new CreateGuestProfileCommand(null, PROPERTY,
                "Other", "Guest", anotherEmail, null, null, null, null));
        profilesToDelete.add(otherProfile.id());
        var otherReservation = reservations.create(new CreateReservationCommand(
                PROPERTY, otherProfile.id(), "GTQ", "WEB_DIRECTA", null, null));
        reservationsToDelete.add(otherReservation.id());
        String otherCode = otherReservation.confirmationCode();
        UUID request = links.issue(guest, otherCode);
        assertNotNull(request);
        verifyNoInteractions(sender);
        assertFalse(links.verify(guest, request, "00000000"));
    }

    @Test
    void challengeRateLimitsDoNotRestartAttemptBudgetIndefinitely() {
        UUID first = links.issue(guest, code);
        UUID latest = first;
        for (int i = 0; i < 2; i++) {
            jdbc.update("UPDATE reservation_link_challenges SET last_sent_at=now()-interval '2 minutes' WHERE id=?",
                    latest);
            latest = links.issue(guest, code);
        }
        UUID denied = links.issue(guest, code);
        assertNotNull(denied);
        assertEquals(3L, jdbc.queryForObject("SELECT count(*) FROM reservation_link_challenges "
                + "WHERE guest_account_id=?", Long.class, guest.guestAccountId()));
        assertEquals(0L, jdbc.queryForObject("SELECT count(*) FROM reservation_link_challenges "
                + "WHERE id=?", Long.class, denied));
    }

    @Test
    void accountDailyLimitAppliesAcrossDifferentReferences() {
        for (int i = 0; i < 10; i++) {
            assertNotNull(links.issue(guest, "UNKNOWN" + i));
        }
        UUID denied = links.issue(guest, code);
        assertEquals(10L, jdbc.queryForObject("SELECT count(*) FROM reservation_link_challenges "
                + "WHERE guest_account_id=?", Long.class, guest.guestAccountId()));
        assertEquals(0L, jdbc.queryForObject("SELECT count(*) FROM reservation_link_challenges WHERE id=?",
                Long.class, denied));
        verifyNoInteractions(sender);
    }

    @Test
    void confirmedLinkAndGuestAuditCannotBeMutated() {
        UUID request = links.issue(guest, code);
        assertTrue(links.verify(guest, request, delivered.get()));
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "DELETE FROM guest_reservation_links WHERE reservation_id=?", reservationId));
        assertThrows(DataAccessException.class, () -> jdbc.update(
                "DELETE FROM guest_auth_audit_events WHERE guest_account_id=?", guest.guestAccountId()));
    }

    @Test
    void wrongOtpLocksAtFiveAttemptsAndExpiryDisablesUse() {
        UUID request = links.issue(guest, code);
        for (int i = 0; i < 5; i++) {
            assertFalse(links.verify(guest, request, "xxxxxxxx"));
        }
        // A syntactically valid but wrong code is counted; malformed input is rejected before lookup.
        for (int i = 0; i < 5; i++) {
            assertFalse(links.verify(guest, request, "00000000".equals(delivered.get()) ? "11111111" : "00000000"));
        }
        assertEquals("LOCKED", jdbc.queryForObject(
                "SELECT status FROM reservation_link_challenges WHERE id=?", String.class, request));
        assertFalse(links.verify(guest, request, delivered.get()));

        jdbc.update("UPDATE reservation_link_challenges SET issued_at=now()-interval '2 minutes', "
                + "last_sent_at=now()-interval '2 minutes' WHERE id=?", request);
        UUID second = links.issue(guest, code);
        jdbc.update("UPDATE reservation_link_challenges SET expires_at=now()-interval '1 second' WHERE id=?", second);
        assertFalse(links.verify(guest, second, delivered.get()));
        assertEquals("EXPIRED", jdbc.queryForObject(
                "SELECT status FROM reservation_link_challenges WHERE id=?", String.class, second));
    }

    @Test
    void resendCooldownAndDeliveryFailureNeverEnableUnconfirmedCode() {
        UUID first = links.issue(guest, code);
        UUID cooldown = links.issue(guest, code);
        assertNotNull(cooldown);
        assertEquals("READY", jdbc.queryForObject(
                "SELECT status FROM reservation_link_challenges WHERE id=?", String.class, first));
        assertEquals(1L, jdbc.queryForObject("SELECT count(*) FROM reservation_link_challenges "
                + "WHERE guest_account_id=? AND status='READY'", Long.class, guest.guestAccountId()));
        jdbc.update("UPDATE reservation_link_challenges SET last_sent_at=now()-interval '2 minutes' WHERE id=?", first);
        doThrow(new IllegalStateException("synthetic delivery timeout")).when(sender)
                .sendReservationLinkOtp(anyString(), anyString());
        UUID unknown = links.issue(guest, code);
        assertEquals("UNKNOWN", jdbc.queryForObject(
                "SELECT status FROM reservation_link_challenges WHERE id=?", String.class, unknown));
        assertFalse(links.verify(guest, unknown, delivered.get()));
        assertEquals("EXPIRED", jdbc.queryForObject(
                "SELECT status FROM reservation_link_challenges WHERE id=?", String.class, first));
    }

    @Test
    void simultaneousVerificationCreatesOneLink() throws Exception {
        UUID request = links.issue(guest, code);
        String otp = delivered.get();
        try (var pool = Executors.newFixedThreadPool(2)) {
            CountDownLatch start = new CountDownLatch(1);
            Future<Boolean> a = pool.submit(() -> { start.await(); return links.verify(guest, request, otp); });
            Future<Boolean> b = pool.submit(() -> { start.await(); return links.verify(guest, request, otp); });
            start.countDown();
            assertEquals(1, (a.get(10, TimeUnit.SECONDS) ? 1 : 0)
                    + (b.get(10, TimeUnit.SECONDS) ? 1 : 0));
        }
        assertEquals(1L, jdbc.queryForObject("SELECT count(*) FROM guest_reservation_links "
                + "WHERE reservation_id=?", Long.class, reservationId));
    }

    @Test
    void httpRequiresGuestJwtAndReturnsGenericChallenge() throws Exception {
        String uri = "/api/v1/guest-auth/reservation-links/challenges";
        String body = "{\"confirmationCode\":\"" + code + "\"}";
        mvc.perform(post(uri).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
        String staffToken = staffJwt.issue(new StaffPrincipal(UUID.randomUUID(), UUID.randomUUID(),
                "staff-test", "SUPER_ADMIN"), Instant.now());
        mvc.perform(post(uri).header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
        String token = jwt.issue(guest, Instant.now());
        mvc.perform(post(uri).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isAccepted());
        verify(sender).sendReservationLinkOtp(guest.email(), delivered.get());
        jdbc.update("UPDATE guest_auth_sessions SET status='REVOKED',revoked_at=now() WHERE id=?",
                guest.sessionId());
        mvc.perform(post(uri).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void httpVerificationReturnsNoContentThenGenericRejection() throws Exception {
        UUID request = links.issue(guest, code);
        String token = jwt.issue(guest, Instant.now());
        String uri = "/api/v1/guest-auth/reservation-links/verify";
        String body = "{\"requestId\":\"" + request + "\",\"otp\":\"" + delivered.get() + "\"}";
        mvc.perform(post(uri).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNoContent());
        mvc.perform(post(uri).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnprocessableEntity());
    }
}
