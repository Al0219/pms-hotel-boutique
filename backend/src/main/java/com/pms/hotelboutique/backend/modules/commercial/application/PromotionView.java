package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.commercial.domain.Promotion;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Read model for a {@code Promotion}. Entities are never exposed directly. */
public record PromotionView(
        UUID id,
        UUID propertyId,
        String code,
        String name,
        Promotion.Status status,
        int priority,
        boolean stackable,
        Promotion.BenefitType benefitType,
        long benefitValueMinor,
        LocalDate validFrom,
        LocalDate validTo,
        Instant createdAt,
        Instant updatedAt) {

    public static PromotionView from(Promotion promotion) {
        return new PromotionView(
                promotion.getId(),
                promotion.getPropertyId(),
                promotion.getCode(),
                promotion.getName(),
                promotion.getStatus(),
                promotion.getPriority(),
                promotion.isStackable(),
                promotion.getBenefitType(),
                promotion.getBenefitValueMinor(),
                promotion.getValidFrom(),
                promotion.getValidTo(),
                promotion.getCreatedAt(),
                promotion.getUpdatedAt());
    }
}
