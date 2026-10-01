package com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationGuest;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationGuestRepository extends JpaRepository<ReservationGuest, UUID> {

    List<ReservationGuest> findByStay_Id(UUID stayId);

    boolean existsByStay_IdAndProfile_Id(UUID stayId, UUID profileId);
}
