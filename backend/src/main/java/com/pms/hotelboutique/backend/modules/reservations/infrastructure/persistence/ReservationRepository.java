package com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.reservations.domain.Reservation;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationRepository extends JpaRepository<Reservation, UUID> {

    Optional<Reservation> findByConfirmationCode(String confirmationCode);

    /**
     * Scope-aware listing: the authorized property ids go straight into the
     * SQL predicate (C2 rule). Never query globally and filter in memory.
     */
    List<Reservation> findByPropertyIdIn(Set<UUID> propertyIds);
}
