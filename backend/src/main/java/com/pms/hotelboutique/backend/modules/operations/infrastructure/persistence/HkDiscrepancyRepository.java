package com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.operations.domain.HkDiscrepancy;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HkDiscrepancyRepository extends JpaRepository<HkDiscrepancy, UUID> {

    List<HkDiscrepancy> findByPropertyIdIn(Set<UUID> propertyIds);
}
