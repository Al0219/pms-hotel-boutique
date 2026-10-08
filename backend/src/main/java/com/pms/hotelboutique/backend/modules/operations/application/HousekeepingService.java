package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.operations.domain.HkRoomState;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * BD3 housekeeping operations (Fase 9).
 *
 * No REST contract is implied. Reads take an explicit
 * {@code AuthorizedPropertyScope} (C2); writes carry the raw property id
 * until controllers resolve scope plus permission.
 */
public interface HousekeepingService {

    HkRoomView trackRoom(UUID propertyId, UUID roomId, UUID actorId);

    HkRoomView statusOf(UUID propertyId, UUID roomId);

    HkRoomView markClean(UUID propertyId, UUID roomId, UUID actorId);

    HkRoomView markDirty(UUID propertyId, UUID roomId, UUID actorId);

    HkRoomView inspect(UUID propertyId, UUID roomId, UUID actorId);

    HkRoomView rejectInspection(UUID propertyId, UUID roomId, String reason, UUID actorId);

    HkRoomView setDnd(UUID propertyId, UUID roomId, boolean dnd, UUID actorId);

    List<HkRoomView> listByScope(AuthorizedPropertyScope scope);

    record HkRoomView(UUID id, UUID propertyId, UUID roomId, HkRoomState.Status status,
            boolean dnd, UUID updatedBy, Instant updatedAt) {

        static HkRoomView from(HkRoomState state) {
            return new HkRoomView(state.getId(), state.getPropertyId(), state.getRoomId(),
                    state.getStatus(), state.isDnd(), state.getUpdatedBy(), state.getUpdatedAt());
        }
    }
}
