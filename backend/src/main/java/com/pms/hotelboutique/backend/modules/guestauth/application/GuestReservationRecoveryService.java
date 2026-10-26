package com.pms.hotelboutique.backend.modules.guestauth.application;

import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** A separate transaction: recovering a link can never roll back a confirmed booking/payment. */
@Service
public class GuestReservationRecoveryService {
    private final GuestAuthService auth;
    private final JdbcClient jdbc;
    private final VerifiedEmailHistoryPort history;
    public GuestReservationRecoveryService(GuestAuthService auth, JdbcClient jdbc, VerifiedEmailHistoryPort history) {
        this.auth=auth; this.jdbc=jdbc; this.history=history;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recover(GuestPrincipal principal) {
        if (principal == null) throw new GuestAuthenticationException();
        UUID account = auth.getActivePrincipal(principal).guestAccountId();
        // Serialize evidence creation and recoveries for this authenticated account.
        var verified = jdbc.sql("""
                SELECT id FROM guest_accounts WHERE id=:account
                AND status='ACTIVE' AND email_verified_at IS NOT NULL FOR NO KEY UPDATE
                """).param("account",account).query(UUID.class).optional();
        if (verified.isEmpty()) throw new GuestAuthenticationException();
        var proof = jdbc.sql("""
                SELECT v.id FROM guest_email_verifications v JOIN guest_accounts a ON a.id=v.guest_account_id
                WHERE a.id=:account AND v.normalized_email=lower(btrim(a.email))
                ORDER BY v.verified_at,v.id LIMIT 1
                """).param("account",account).query(UUID.class).optional().orElseGet(() -> {
                    UUID id=UUID.randomUUID();
                    // Existing server-owned verification timestamp is evidence; never claim a new OTP/Google verification.
                    jdbc.sql("""
                            INSERT INTO guest_email_verifications(id,guest_account_id,normalized_email,source,verified_at)
                            SELECT :id,id,lower(btrim(email)),'ACCOUNT',email_verified_at
                            FROM guest_accounts WHERE id=:account AND status='ACTIVE' AND email_verified_at IS NOT NULL
                            """).param("id",id).param("account",account).update();
                    return id;
                });
        history.linkConfirmedCompatibleReservations(account,proof);
    }
}
