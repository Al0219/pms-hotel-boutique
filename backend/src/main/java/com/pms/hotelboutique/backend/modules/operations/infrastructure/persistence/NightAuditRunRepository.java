package com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.operations.domain.NightAuditRun;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NightAuditRunRepository extends JpaRepository<NightAuditRun, UUID> {

    List<NightAuditRun> findByPropertyIdIn(Set<UUID> propertyIds);
}
