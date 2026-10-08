package com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.operations.domain.HkRoomState;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HkRoomStateRepository extends JpaRepository<HkRoomState, UUID> {

    Optional<HkRoomState> findByPropertyIdAndRoomId(UUID propertyId, UUID roomId);

    List<HkRoomState> findByPropertyIdIn(Set<UUID> propertyIds);
}
