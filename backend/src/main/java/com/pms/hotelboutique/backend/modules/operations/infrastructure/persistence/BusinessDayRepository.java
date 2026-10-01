package com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.operations.domain.BusinessDay;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BusinessDayRepository extends JpaRepository<BusinessDay, UUID> {

    Optional<BusinessDay> findByPropertyIdAndStatus(UUID propertyId, BusinessDay.Status status);

    List<BusinessDay> findByPropertyIdIn(Set<UUID> propertyIds);
}
