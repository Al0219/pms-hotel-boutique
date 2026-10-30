package com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Reads stay bounded by an already authorized reservation/property. No new persistence or ledger. */
@Repository
public class StaffCancellationRepository {
    private final JdbcTemplate jdbc;
    public StaffCancellationRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public boolean hasCreationProof(UUID property, UUID reservation) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(
                  SELECT 1 FROM public_booking_receipts b JOIN reservations r ON r.id=b.reservation_id
                  WHERE r.property_id=? AND r.id=?
                  UNION ALL
                  SELECT 1 FROM local_operation_receipts l
                  WHERE l.property_id=? AND l.result_id=? AND l.operation_name='STAFF_RESERVATION_CREATE')
                """, Boolean.class, property, reservation, property, reservation));
    }

    public boolean hasForeignLinks(UUID property, UUID reservation) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM reservation_stays WHERE reservation_id=? AND property_id<>?
                  UNION ALL SELECT 1 FROM folios WHERE reservation_id=? AND property_id<>?)
                """, Boolean.class, reservation, property, reservation, property));
    }

    public Optional<Stored> completed(UUID property, UUID reservation, UUID operation) {
        return jdbc.query("""
                SELECT l.id,l.completed_at,a.after_state,a.reason
                FROM local_operation_receipts l JOIN reservation_audit_events a ON a.id=l.result_id
                WHERE l.property_id=? AND a.property_id=? AND a.entity_id=?
                  AND l.operation_name='STAFF_RESERVATION_CANCEL' AND a.action='STAFF_RESERVATION_CANCELLED'
                  AND a.entity_type='RESERVATION' AND a.actor_id=l.staff_user_id
                  AND a.correlation_id=l.id
                """ + (operation == null ? " ORDER BY l.completed_at DESC,l.id DESC LIMIT 1" : " AND l.id=?"),
                (row, index) -> new Stored(row.getObject("id", UUID.class), row.getTimestamp("completed_at").toInstant(),
                        row.getString("after_state"), row.getString("reason")),
                operation == null ? new Object[]{property, property, reservation}
                        : new Object[]{property, property, reservation, operation})
                .stream().findFirst();
    }

    public record Stored(UUID operationId, Instant completedAt, String snapshot, String reason) { }
}
