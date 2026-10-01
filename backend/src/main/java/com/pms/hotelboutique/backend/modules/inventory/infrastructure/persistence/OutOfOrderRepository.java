package com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.inventory.domain.OutOfOrderRecord;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.inventory.application.StayDateRange;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Internal persistence. Application reads must use the methods requiring a resolved scope. */
public interface OutOfOrderRepository extends JpaRepository<OutOfOrderRecord, UUID> {
    @Query("""
            select e from OutOfOrderRecord e join Property p on e.propertyId = p.id
            where p.organizationId = :#{#scope.organizationId} and p.id in :#{#scope.propertyIds}
            order by e.id
            """)
    List<OutOfOrderRecord> findAllInScope(@Param("scope") AuthorizedPropertyScope scope);

    @Query("""
            select e from OutOfOrderRecord e join Property p on e.propertyId = p.id
            where p.organizationId = :#{#scope.organizationId} and p.id in :#{#scope.propertyIds} and e.id = :id
            """)
    Optional<OutOfOrderRecord> findByIdInScope(@Param("scope") AuthorizedPropertyScope scope, @Param("id") UUID id);

    /**
     * Current unreleased OOO rooms per local night. OOS never discounts ATS.
     * One room with overlapping records counts once; departure is exclusive.
     */
    @Query(value = """
            select (cast(:#{#dates.arrival} as date) + n.day_offset) as night,
                   count(distinct o.room_id) as "roomCount"
            from properties p
            join room_types rt on rt.property_id = p.id and rt.id = :roomTypeId
            cross join generate_series(0,
                cast(:#{#dates.departure} as date) - cast(:#{#dates.arrival} as date) - 1) n(day_offset)
            left join rooms r on r.property_id = p.id and r.room_type_id = rt.id
            left join out_of_order_records o
                on o.property_id = p.id and o.room_id = r.id
                and o.kind = 'OOO' and o.released_at is null
                and o.start_date <= cast(:#{#dates.arrival} as date) + n.day_offset
                and o.end_date > cast(:#{#dates.arrival} as date) + n.day_offset
            where p.id = :propertyId and p.organization_id = :#{#scope.organizationId}
              and p.id in (:#{#scope.propertyIds})
            group by n.day_offset
            order by n.day_offset
            """, nativeQuery = true)
    List<OutOfOrderNightCount> countOutOfOrderByNight(
            @Param("scope") AuthorizedPropertyScope scope,
            @Param("propertyId") UUID propertyId,
            @Param("roomTypeId") UUID roomTypeId,
            @Param("dates") StayDateRange dates);
}
