package com.pms.hotelboutique.backend.modules.guestauth.application;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Single-reservation readonly lookup, independent of account authentication and email delivery. */
@Service
public class PublicReservationLookupService {
    private final JdbcClient jdbc;
    private final TransactionTemplate tx;
    private final PublicReservationLookupReadPort reads;

    public PublicReservationLookupService(JdbcClient jdbc, PlatformTransactionManager manager,
            PublicReservationLookupReadPort reads) {
        this.jdbc = jdbc;
        this.tx = new TransactionTemplate(manager);
        this.reads = reads;
    }

    public PublicReservationLookupReadPort.Result search(String email, String confirmationCode) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        String normalizedCode = confirmationCode.trim().toUpperCase(Locale.ROOT);
        String emailHash = fingerprint("email", normalizedEmail);
        String codeHash = fingerprint("reference", normalizedCode);
        var result = tx.execute(status -> {
            // Stable ordering serializes shared email/code budgets without deadlocks.
            java.util.stream.Stream.of(emailHash, codeHash).sorted().forEach(this::lock);
            if (exhausted("email_fingerprint", emailHash) || exhausted("code_fingerprint", codeHash)) {
                throw new PublicReservationLookupException(429);
            }
            var found = reads.find(normalizedEmail, normalizedCode);
            jdbc.sql("""
                INSERT INTO public_reservation_queries(id,email_fingerprint,code_fingerprint,outcome,occurred_at)
                VALUES(:id,:email,:code,:outcome,now())
                """).param("id", UUID.randomUUID()).param("email", emailHash).param("code", codeHash)
                .param("outcome", found.stays().isEmpty() ? "MISS" : "FOUND").update();
            return found;
        });
        // Missing credentials commit their attempt before the identical public error.
        if (result == null || result.stays().isEmpty()) throw new PublicReservationLookupException(404);
        return result;
    }

    private boolean exhausted(String column, String fingerprint) {
        // Column names are constants internal to this service, never request inputs.
        return jdbc.sql("SELECT count(*) FILTER (WHERE occurred_at>now()-interval '1 hour')>=10 OR "
                + "count(*) FILTER (WHERE outcome='MISS' AND occurred_at>now()-interval '30 minutes')>=5 "
                + "FROM public_reservation_queries WHERE " + column + "=:fingerprint AND occurred_at>now()-interval '1 hour'")
            .param("fingerprint", fingerprint).query(Boolean.class).single();
    }

    private void lock(String fingerprint) {
        jdbc.sql("SELECT pg_advisory_xact_lock(:lock)")
            .param("lock", Long.parseUnsignedLong(fingerprint.substring(0, 16), 16))
            .query(rs -> { rs.next(); return true; });
    }

    private String fingerprint(String purpose, String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(
                ("public-reservation-query:" + purpose + ":" + value).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException unavailable) {
            throw new IllegalStateException("Lookup protection unavailable", unavailable);
        }
    }
}
