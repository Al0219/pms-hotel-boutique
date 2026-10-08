package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.domain.Room;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.RoomRepository;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.RoomTypeRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class RoomService {
    private final RoomRepository rooms;
    private final RoomTypeRepository types;
    private final InventoryCatalogSupport support;

    public RoomService(RoomRepository rooms, RoomTypeRepository types, InventoryCatalogSupport support) {
        this.rooms = rooms;
        this.types = types;
        this.support = support;
    }

    @PreAuthorize("@propertyAccess.canUpdate(authentication)")
    public RoomView create(UUID propertyId, UUID roomTypeId, String code) {
        var context = support.resolve(propertyId, true);
        // Same parent-row lock used by inventory admission. Never creates a foreign-property room.
        types.lockInProperty(context.scope(), propertyId, roomTypeId).orElseThrow(CatalogNotFoundException::new);
        var room = rooms.saveAndFlush(new Room(UUID.randomUUID(), propertyId, roomTypeId, code, support.now()));
        var result = RoomView.from(room);
        support.record(context, "ROOM", room.getId(), null, result);
        return result;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@propertyAccess.isStaff(authentication)")
    public List<RoomView> list(UUID propertyId) {
        var context = support.resolve(propertyId, false);
        return rooms.findAllInScope(context.scope()).stream().map(RoomView::from).toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@propertyAccess.isStaff(authentication)")
    public RoomView get(UUID propertyId, UUID roomId) {
        var context = support.resolve(propertyId, false);
        return RoomView.from(rooms.findByIdInScope(context.scope(), roomId)
                .filter(r -> r.getPropertyId().equals(propertyId)).orElseThrow(CatalogNotFoundException::new));
    }

    @PreAuthorize("@propertyAccess.canUpdate(authentication)")
    public RoomView update(UUID propertyId, UUID roomId, String code) {
        var context = support.resolve(propertyId, true);
        if (code == null) { throw new IllegalArgumentException("Code required"); }
        var room = rooms.lockInProperty(context.scope(), propertyId, roomId).orElseThrow(CatalogNotFoundException::new);
        var before = RoomView.from(room);
        if (room.rename(code, support.now())) {
            rooms.flush();
            support.record(context, "ROOM", roomId, before, RoomView.from(room));
        }
        return RoomView.from(room);
    }
}
