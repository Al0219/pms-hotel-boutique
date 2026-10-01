package com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.reservations.domain.GuestProfile;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GuestProfileRepository extends JpaRepository<GuestProfile, UUID> {

    List<GuestProfile> findByGuestAccount_Id(UUID accountId);
}
