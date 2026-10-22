package com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence;

import com.pms.hotelboutique.backend.modules.operations.domain.HkRoomState;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HkRoomStateRepository extends JpaRepository<HkRoomState, UUID> {

    Optional<HkRoomState> findByPropertyIdAndRoomId(UUID propertyId, UUID roomId);

    @org.springframework.data.jpa.repository.Query("select s.status from HkRoomState s where s.propertyId = :propertyId and s.roomId = :roomId")
    Optional<HkRoomState.Status> findStatusByPropertyIdAndRoomId(
            @org.springframework.data.repository.query.Param("propertyId") UUID propertyId,
            @org.springframework.data.repository.query.Param("roomId") UUID roomId);

    List<HkRoomState> findByPropertyIdIn(Set<UUID> propertyIds);
}
