package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.domain.RoomType;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.RoomTypeRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class RoomTypeService {
    private final RoomTypeRepository types;
    private final InventoryCatalogSupport support;

    public RoomTypeService(RoomTypeRepository types, InventoryCatalogSupport support) {
        this.types = types;
        this.support = support;
    }

    @PreAuthorize("@propertyAccess.canUpdate(authentication)")
    public RoomTypeView create(UUID propertyId, String code, String name) {
        var context = support.resolve(propertyId, true);
        var type = types.saveAndFlush(new RoomType(UUID.randomUUID(), propertyId, code, name, support.now()));
        var result = RoomTypeView.from(type);
        support.record(context, "ROOM_TYPE", type.getId(), null, result);
        return result;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@propertyAccess.isStaff(authentication)")
    public List<RoomTypeView> list(UUID propertyId) {
        var context = support.resolve(propertyId, false);
        return types.findAllInScope(context.scope()).stream().map(RoomTypeView::from).toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@propertyAccess.isStaff(authentication)")
    public RoomTypeView get(UUID propertyId, UUID roomTypeId) {
        var context = support.resolve(propertyId, false);
        return RoomTypeView.from(types.findByIdInScope(context.scope(), roomTypeId)
                .filter(t -> t.getPropertyId().equals(propertyId)).orElseThrow(CatalogNotFoundException::new));
    }

    @PreAuthorize("@propertyAccess.canUpdate(authentication)")
    public RoomTypeView update(UUID propertyId, UUID roomTypeId, String code, String name) {
        var context = support.resolve(propertyId, true);
        if (code == null && name == null) { throw new IllegalArgumentException("At least one field required"); }
        var type = types.lockInProperty(context.scope(), propertyId, roomTypeId).orElseThrow(CatalogNotFoundException::new);
        var before = RoomTypeView.from(type);
        if (type.rename(code == null ? type.getCode() : code, name == null ? type.getName() : name, support.now())) {
            types.flush();
            support.record(context, "ROOM_TYPE", type.getId(), before, RoomTypeView.from(type));
        }
        return RoomTypeView.from(type);
    }
}
