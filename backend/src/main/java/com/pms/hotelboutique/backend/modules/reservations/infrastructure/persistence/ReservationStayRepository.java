package com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationStay;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservationStayRepository extends JpaRepository<ReservationStay, UUID> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select s from ReservationStay s join Property p on s.propertyId = p.id
            where s.id = :id and p.organizationId = :#{#scope.organizationId}
              and p.id in :#{#scope.propertyIds}
            """)
    Optional<ReservationStay> lockInScope(@Param("scope") AuthorizedPropertyScope scope, @Param("id") UUID id);

    @Query("""
            select count(s) from ReservationStay s
            where s.propertyId in :#{#scope.propertyIds} and s.propertyId = :propertyId
              and s.roomId = :roomId and s.arrival < :departure and s.departure > :arrival
              and s.status in (com.pms.hotelboutique.backend.modules.reservations.domain.ReservationStay.Status.RESERVED,
                               com.pms.hotelboutique.backend.modules.reservations.domain.ReservationStay.Status.IN_HOUSE)
              and s.reservation.status <> com.pms.hotelboutique.backend.modules.reservations.domain.Reservation.Status.CANCELLED
            """)
    long countRoomConflicts(@Param("scope") AuthorizedPropertyScope scope, @Param("propertyId") UUID propertyId,
            @Param("roomId") UUID roomId, @Param("arrival") java.time.LocalDate arrival,
            @Param("departure") java.time.LocalDate departure);

    List<ReservationStay> findByReservation_Id(UUID reservationId);

    List<ReservationStay> findByReservation_IdAndPropertyId(UUID reservationId, UUID propertyId);

    List<ReservationStay> findByReservation_IdAndPropertyIdIn(UUID reservationId,
            Set<UUID> propertyIds);

    @Query("""
            select s from ReservationStay s join Property p on s.propertyId = p.id
            where s.id = :id and p.organizationId = :#{#scope.organizationId}
              and p.id in :#{#scope.propertyIds}
            """)
    Optional<ReservationStay> findByIdInScope(@Param("scope") AuthorizedPropertyScope scope,
            @Param("id") UUID id);
}
