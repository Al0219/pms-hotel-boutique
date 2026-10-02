package com.pms.hotelboutique.backend.modules.commercial.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.commercial.domain.RoomBlock;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Internal persistence. Application reads must use the methods requiring a resolved scope. */
public interface RoomBlockRepository extends JpaRepository<RoomBlock, UUID> {

    @Query("""
            select e from RoomBlock e join Property p
              on e.propertyId = p.id
            where p.organizationId = :#{#scope.organizationId} and p.id in :#{#scope.propertyIds}
            order by e.arrival
            """)
    List<RoomBlock> findAllInScope(@Param("scope") AuthorizedPropertyScope scope);

    @Query("""
            select e from RoomBlock e join Property p
              on e.propertyId = p.id
            where p.organizationId = :#{#scope.organizationId} and p.id in :#{#scope.propertyIds} and e.id = :id
            """)
    Optional<RoomBlock> findByIdInScope(@Param("scope") AuthorizedPropertyScope scope,
            @Param("id") UUID id);

    @Query("""
            select e from RoomBlock e join Property p
              on e.propertyId = p.id
            where p.organizationId = :#{#scope.organizationId} and p.id in :#{#scope.propertyIds}
              and e.groupId = :groupId
            order by e.arrival
            """)
    List<RoomBlock> findByGroupInScope(@Param("scope") AuthorizedPropertyScope scope,
            @Param("groupId") UUID groupId);
}
