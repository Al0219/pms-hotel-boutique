package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.domain.RatePlan;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.RatePlanRepository;
import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.RoomTypeRepository;
import com.pms.hotelboutique.backend.shared.money.MonetaryAmount;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class RatePlanService {
    private final RatePlanRepository plans;
    private final RoomTypeRepository types;
    private final InventoryCatalogSupport support;

    public RatePlanService(RatePlanRepository plans, RoomTypeRepository types, InventoryCatalogSupport support) {
        this.plans = plans;
        this.types = types;
        this.support = support;
    }

    @PreAuthorize("@propertyAccess.canUpdate(authentication)")
    public RatePlanView create(UUID propertyId, UUID roomTypeId, String code, String name, MonetaryAmount price) {
        var context = support.resolve(propertyId, true);
        types.findByIdInScope(context.scope(), roomTypeId).filter(t -> t.getPropertyId().equals(propertyId))
                .orElseThrow(CatalogNotFoundException::new);
        var plan = plans.saveAndFlush(new RatePlan(UUID.randomUUID(), propertyId, roomTypeId, code, name, price, support.now()));
        var result = RatePlanView.from(plan);
        support.record(context, "RATE_PLAN", plan.getId(), null, result);
        return result;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@propertyAccess.isStaff(authentication)")
    public List<RatePlanView> list(UUID propertyId) {
        var context = support.resolve(propertyId, false);
        return plans.findAllInScope(context.scope()).stream().map(RatePlanView::from).toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@propertyAccess.isStaff(authentication)")
    public RatePlanView get(UUID propertyId, UUID ratePlanId) {
        var context = support.resolve(propertyId, false);
        return RatePlanView.from(plans.findByIdInScope(context.scope(), ratePlanId)
                .filter(p -> p.getPropertyId().equals(propertyId)).orElseThrow(CatalogNotFoundException::new));
    }

    @PreAuthorize("@propertyAccess.canUpdate(authentication)")
    public RatePlanView update(UUID propertyId, UUID ratePlanId, String code, String name, MonetaryAmount price) {
        var context = support.resolve(propertyId, true);
        if (code == null && name == null && price == null) { throw new IllegalArgumentException("At least one field required"); }
        var plan = plans.lockInProperty(context.scope(), propertyId, ratePlanId).orElseThrow(CatalogNotFoundException::new);
        var before = RatePlanView.from(plan);
        if (plan.revise(code == null ? plan.getCode() : code, name == null ? plan.getName() : name,
                price == null ? plan.getBasePrice() : price, support.now())) {
            plans.flush();
            support.record(context, "RATE_PLAN", ratePlanId, before, RatePlanView.from(plan));
        }
        return RatePlanView.from(plan);
    }
}
