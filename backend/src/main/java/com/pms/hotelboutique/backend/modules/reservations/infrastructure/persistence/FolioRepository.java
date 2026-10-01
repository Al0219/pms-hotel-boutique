package com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.reservations.domain.Folio;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FolioRepository extends JpaRepository<Folio, UUID> {

    List<Folio> findByReservation_Id(UUID reservationId);
}
