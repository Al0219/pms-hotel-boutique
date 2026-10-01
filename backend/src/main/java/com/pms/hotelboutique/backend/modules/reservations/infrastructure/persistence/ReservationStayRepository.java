package com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationStay;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationStayRepository extends JpaRepository<ReservationStay, UUID> {

    List<ReservationStay> findByReservation_Id(UUID reservationId);
}
