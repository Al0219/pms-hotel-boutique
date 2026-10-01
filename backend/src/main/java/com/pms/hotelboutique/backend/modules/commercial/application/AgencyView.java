package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.commercial.domain.Agency;
import java.time.Instant;
import java.util.UUID;

/** Read model for an {@code Agency}. Entities are never exposed directly. */
public record AgencyView(
        UUID id,
        UUID propertyId,
        String code,
        String name,
        Agency.CommissionModel commissionModel,
        String email,
        String phone,
        Agency.Status status,
        Instant createdAt,
        Instant updatedAt) {

    public static AgencyView from(Agency agency) {
        return new AgencyView(
                agency.getId(),
                agency.getPropertyId(),
                agency.getCode(),
                agency.getName(),
                agency.getCommissionModel(),
                agency.getEmail(),
                agency.getPhone(),
                agency.getStatus(),
                agency.getCreatedAt(),
                agency.getUpdatedAt());
    }
}
