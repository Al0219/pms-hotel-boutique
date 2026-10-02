package com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.inventory.domain.Property;
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
public interface PropertyRepository extends JpaRepository<Property, UUID> {
    @Query("""
            select e from Property e
            where e.organizationId = :#{#scope.organizationId} and e.id in :#{#scope.propertyIds}
            order by e.id
            """)
    List<Property> findAllInScope(@Param("scope") AuthorizedPropertyScope scope);

    @Query("""
            select e from Property e
            where e.organizationId = :#{#scope.organizationId} and e.id in :#{#scope.propertyIds}
              and e.status = com.pms.hotelboutique.backend.modules.inventory.domain.Property.Status.ACTIVE
            order by e.id
            """)
    List<Property> findActiveInScope(@Param("scope") AuthorizedPropertyScope scope);

    @Query("""
            select e from Property e
            where e.organizationId = :#{#scope.organizationId} and e.id in :#{#scope.propertyIds} and e.id = :id
            """)
    Optional<Property> findByIdInScope(@Param("scope") AuthorizedPropertyScope scope, @Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select e from Property e
            where e.organizationId = :#{#scope.organizationId} and e.id in :#{#scope.propertyIds} and e.id = :id
            """)
    Optional<Property> lockByIdInScope(@Param("scope") AuthorizedPropertyScope scope, @Param("id") UUID id);
}
