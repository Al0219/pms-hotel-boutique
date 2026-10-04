package com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.reservations.domain.Reservation;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservationRepository extends JpaRepository<Reservation, UUID> {

    Optional<Reservation> findByConfirmationCode(String confirmationCode);

    List<Reservation> findByGroupId(UUID groupId);

    List<Reservation> findByRoomBlockId(UUID roomBlockId);

    List<Reservation> findByRoomBlockIdAndPropertyId(UUID roomBlockId, UUID propertyId);

    @Query("""
            select r from Reservation r join Property p on r.propertyId = p.id
            where r.id = :id and p.organizationId = :#{#scope.organizationId}
              and p.id in :#{#scope.propertyIds}
            """)
    Optional<Reservation> findByIdInScope(@Param("scope") AuthorizedPropertyScope scope,
            @Param("id") UUID id);

    /**
     * Scope-aware listing: the authorized property ids go straight into the
     * SQL predicate (C2 rule). Never query globally and filter in memory.
     */
    List<Reservation> findByPropertyIdIn(Set<UUID> propertyIds);
}
