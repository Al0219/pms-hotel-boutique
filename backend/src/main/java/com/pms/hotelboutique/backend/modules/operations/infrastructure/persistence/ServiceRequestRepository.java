package com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, UUID> {

    Optional<ServiceRequest> findByIdAndPropertyId(UUID id, UUID propertyId);

    List<ServiceRequest> findByPropertyIdIn(Set<UUID> propertyIds);
}
