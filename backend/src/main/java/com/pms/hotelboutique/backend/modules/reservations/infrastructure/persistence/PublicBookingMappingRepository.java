package com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.reservations.application.PublicBookingRequest;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Public mapping reads only; never uses Staff scope or updates an existing profile. */
@Repository
public class PublicBookingMappingRepository {
    private final JdbcTemplate jdbc;

    public PublicBookingMappingRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public boolean roomTypeExists(UUID propertyId, UUID roomTypeId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM room_types WHERE property_id=? AND id=?)",
                Boolean.class, propertyId, roomTypeId));
    }

    public Optional<UUID> findReusableProfile(UUID propertyId, PublicBookingRequest.BookingGuest guest) {
        // C collation enforces exact case/Unicode identity regardless of database
        // defaults. At most two ids suffice to distinguish unique from ambiguous.
        boolean enriched = guest.phone() != null || guest.country() != null || guest.documentNumber() != null;
        String contactPredicate = enriched ? """
                  AND phone IS NOT DISTINCT FROM ?
                  AND country IS NOT DISTINCT FROM ?
                  AND document_number COLLATE "C" IS NOT DISTINCT FROM ?
                """ : "";
        var parameters = new java.util.ArrayList<Object>();
        parameters.add(propertyId);
        parameters.add(guest.firstName());
        parameters.add(guest.lastName());
        parameters.add(guest.email());
        if (enriched) {
            parameters.add(guest.phone());
            parameters.add(guest.country());
            parameters.add(guest.documentNumber());
        }
        // A public caller cannot overwrite an existing guest's contact/identity.
        // Reuse enriched profiles only when every submitted contact field matches.
        var matches = jdbc.query("""
                SELECT id FROM guest_profiles
                WHERE property_id=? AND status='ACTIVE' AND guest_account_id IS NULL
                  AND first_name COLLATE "C" = ? AND last_name COLLATE "C" = ? AND email COLLATE "C" = ?
                """ + contactPredicate + " ORDER BY id LIMIT 2",
                (row, index) -> row.getObject("id", UUID.class), parameters.toArray());
        return matches.size() == 1 ? Optional.of(matches.getFirst()) : Optional.empty();
    }
}
