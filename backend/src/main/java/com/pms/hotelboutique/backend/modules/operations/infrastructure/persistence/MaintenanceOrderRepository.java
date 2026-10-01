package com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.operations.domain.MaintenanceOrder;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MaintenanceOrderRepository extends JpaRepository<MaintenanceOrder, UUID> {

    List<MaintenanceOrder> findByPropertyIdIn(Set<UUID> propertyIds);
}
