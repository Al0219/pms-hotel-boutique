package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.inventory.domain.Room;
import com.pms.hotelboutique.backend.modules.operations.domain.HkRoomState;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.HkRoomStateRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Internal guard over trusted domain IDs, not an HTTP authorization boundary. */
@Service
@Transactional
public class RoomReadinessService {
    private final EntityManager entities;
    private final HkRoomStateRepository states;

    public RoomReadinessService(EntityManager entities, HkRoomStateRepository states) {
        this.entities = entities;
        this.states = states;
    }

    public void lockRoom(UUID propertyId, UUID roomId) {
        if (propertyId == null || roomId == null) throw new HousekeepingException("An assigned room is required");
        var room = entities.find(Room.class, roomId, LockModeType.PESSIMISTIC_WRITE);
        if (room == null || !propertyId.equals(room.getPropertyId()))
            throw new HousekeepingException("Room does not belong to property");
    }

    public void requireInspected(UUID propertyId, UUID roomId) {
        lockRoom(propertyId, roomId);
        // Scalar query bypasses a stale first-level entity snapshot after waiting for Room.
        if (states.findStatusByPropertyIdAndRoomId(propertyId, roomId).orElse(null) != HkRoomState.Status.INSPECTED)
            throw new HousekeepingException("Room must be inspected before check-in");
    }
}
