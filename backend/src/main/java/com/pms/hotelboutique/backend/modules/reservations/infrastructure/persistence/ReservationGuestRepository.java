package com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationGuest;
import java.util.List;
import java.util.UUID;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationGuestRepository extends JpaRepository<ReservationGuest, UUID> {

    List<ReservationGuest> findByStay_Id(UUID stayId);

    @Query("""
            select g from ReservationGuest g join g.stay s join g.profile profile join Property p on p.id = s.propertyId
            where s.id = :stayId and s.propertyId in :#{#scope.propertyIds}
              and p.organizationId = :#{#scope.organizationId}
              and (profile.propertyId is null or profile.propertyId = s.propertyId)
            order by g.id
            """)
    List<ReservationGuest> findByStayInScope(@Param("scope") AuthorizedPropertyScope scope, @Param("stayId") UUID stayId);

    boolean existsByStay_IdAndProfile_Id(UUID stayId, UUID profileId);
}
