package com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Scoped, read-only projection of the existing append-only cleaning history. */
public interface HousekeepingReasonRepository extends Repository<ReservationAuditEvent, UUID> {
    @Query(value = """
            SELECT DISTINCT ON (entity_id) entity_id AS "stateId", reason
            FROM reservation_audit_events
            WHERE property_id = :propertyId AND entity_type = 'HK_ROOM_STATE'
              AND entity_id IN (:stateIds)
              AND action IN ('HK_SOILED', 'HK_INSPECTION_REJECTED', 'HK_CLEANED', 'HK_INSPECTED')
            ORDER BY entity_id, occurred_at DESC, created_at DESC, id DESC
            """, nativeQuery = true)
    List<CleaningReason> latestCleaningReasons(@Param("propertyId") UUID propertyId,
            @Param("stateIds") Collection<UUID> stateIds);

    interface CleaningReason {
        UUID getStateId();
        String getReason();
    }
}
