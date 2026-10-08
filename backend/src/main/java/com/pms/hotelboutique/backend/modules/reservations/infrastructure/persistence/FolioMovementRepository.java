package com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.reservations.domain.FolioMovement;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/**
 * Read and insert access for folio movements. No update or delete method is
 * ever called: history is append-only by design and by database trigger.
 */
public interface FolioMovementRepository extends JpaRepository<FolioMovement, UUID> {

    List<FolioMovement> findByFolio_IdOrderByCreatedAtAsc(UUID folioId);

    boolean existsByReverses_Id(UUID movementId);

    /** Resolve a reversal target only inside the authorized folio and property. */
    Optional<FolioMovement> findByIdAndFolio_IdAndFolio_PropertyId(
            UUID movementId, UUID folioId, UUID propertyId);

    @Query("SELECT COALESCE(SUM(m.amountMinor), 0) FROM FolioMovement m WHERE m.folio.id = :folioId")
    long sumByFolioId(UUID folioId);
}
