package com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.inventory.domain.Room;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;

/** Internal persistence. Application reads must use the methods requiring a resolved scope. */
public interface RoomRepository extends JpaRepository<Room, UUID> {
    @Query("""
            select e from Room e join Property p on e.propertyId = p.id
            where p.organizationId = :#{#scope.organizationId} and p.id in :#{#scope.propertyIds}
            order by e.id
            """)
    List<Room> findAllInScope(@Param("scope") AuthorizedPropertyScope scope);

    @Query("""
            select e from Room e join Property p on e.propertyId = p.id
            where p.organizationId = :#{#scope.organizationId} and p.id in :#{#scope.propertyIds} and e.id = :id
            """)
    Optional<Room> findByIdInScope(@Param("scope") AuthorizedPropertyScope scope, @Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select e from Room e join Property p on e.propertyId = p.id
            where p.organizationId = :#{#scope.organizationId} and p.id in :#{#scope.propertyIds}
              and e.propertyId = :propertyId and e.id = :id
            """)
    Optional<Room> lockInProperty(@Param("scope") AuthorizedPropertyScope scope,
            @Param("propertyId") UUID propertyId, @Param("id") UUID id);

    @Query("""
            select count(e) from Room e join Property p on e.propertyId = p.id
            where p.organizationId = :#{#scope.organizationId} and p.id in :#{#scope.propertyIds}
              and e.propertyId = :propertyId and e.roomTypeId = :roomTypeId
            """)
    long countPhysicalRooms(@Param("scope") AuthorizedPropertyScope scope,
            @Param("propertyId") UUID propertyId, @Param("roomTypeId") UUID roomTypeId);
}
