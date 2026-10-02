package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.domain.RatePlan;
import java.time.Instant;
import java.util.UUID;

public record RatePlanView(UUID id, UUID propertyId, UUID roomTypeId, String code, String name,
        Price basePrice, Instant createdAt, Instant updatedAt) {
    static RatePlanView from(RatePlan plan) {
        var price = plan.getBasePrice();
        return new RatePlanView(plan.getId(), plan.getPropertyId(), plan.getRoomTypeId(), plan.getCode(), plan.getName(),
                new Price(price.amount().toPlainString(), price.currency().getCurrencyCode()), plan.getCreatedAt(), plan.getUpdatedAt());
    }
    public record Price(String amount, String currency) { }
}
