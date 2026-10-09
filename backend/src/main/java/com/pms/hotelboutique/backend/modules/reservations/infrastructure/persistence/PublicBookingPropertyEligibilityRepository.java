package com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence;

import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Locks the current property row after inventory admission, until the exterior commit. */
@Repository
public class PublicBookingPropertyEligibilityRepository {
    private final JdbcTemplate jdbc;

    public PublicBookingPropertyEligibilityRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Optional<Eligibility> lock(UUID propertyId) {
        // FOR SHARE allows concurrent bookings but blocks status/currency updates.
        // FOR KEY SHARE would not protect those non-key columns. Read through JDBC
        // so a Property cached before waiting for inventory cannot authorize payment.
        return jdbc.query("SELECT status,currency FROM properties WHERE id=? FOR SHARE",
                (row, index) -> new Eligibility(row.getString("status"), row.getString("currency")), propertyId)
                .stream().findFirst();
    }

    public record Eligibility(String status, String currency) { }
}
