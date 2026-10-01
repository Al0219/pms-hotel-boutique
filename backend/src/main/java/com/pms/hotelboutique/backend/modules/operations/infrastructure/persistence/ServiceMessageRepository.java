package com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.operations.domain.ServiceMessage;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceMessageRepository extends JpaRepository<ServiceMessage, UUID> {

    List<ServiceMessage> findByPropertyIdIn(Set<UUID> propertyIds);

    List<ServiceMessage> findByGuestProfileIdOrderBySentAtAsc(UUID guestProfileId);
}
