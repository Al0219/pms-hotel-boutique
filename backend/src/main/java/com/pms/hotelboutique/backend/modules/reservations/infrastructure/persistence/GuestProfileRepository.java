package com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.reservations.domain.GuestProfile;
import java.util.List;
import java.util.UUID;
import java.util.Optional;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GuestProfileRepository extends JpaRepository<GuestProfile, UUID> {

    List<GuestProfile> findByGuestAccount_Id(UUID accountId);

    /** Contact only through the responsible profile of this authorized reservation. */
    @Query("""
            select g from Reservation r join r.bookingGuest g join Property p on p.id = r.propertyId
            where r.id = :reservationId and r.propertyId in :#{#scope.propertyIds}
              and p.organizationId = :#{#scope.organizationId}
              and (g.propertyId is null or g.propertyId = r.propertyId)
            """)
    Optional<GuestProfile> findResponsibleInScope(@Param("scope") AuthorizedPropertyScope scope,
            @Param("reservationId") UUID reservationId);
}
