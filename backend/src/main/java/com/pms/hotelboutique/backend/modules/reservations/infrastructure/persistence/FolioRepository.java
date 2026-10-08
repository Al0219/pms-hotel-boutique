package com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.reservations.domain.Folio;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FolioRepository extends JpaRepository<Folio, UUID> {

    List<Folio> findByReservation_Id(UUID reservationId);

    List<Folio> findByGroupId(UUID groupId);

    /**
     * Scope-aware listing: the authorized property ids go straight into the
     * SQL predicate (C2 rule). Never query globally and filter in memory.
     */
    List<Folio> findByPropertyIdIn(Set<UUID> propertyIds);

    /** Detail reads must restrict properties in SQL, before loading a folio. */
    Optional<Folio> findByIdAndPropertyIdIn(UUID folioId, Set<UUID> propertyIds);
}
