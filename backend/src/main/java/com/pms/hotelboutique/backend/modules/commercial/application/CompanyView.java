package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.commercial.domain.Company;
import java.time.Instant;
import java.util.UUID;

/** Read model for a {@code Company}. Entities are never exposed directly. */
public record CompanyView(
        UUID id,
        UUID propertyId,
        String code,
        String name,
        String taxId,
        String email,
        String phone,
        Company.Status status,
        Instant createdAt,
        Instant updatedAt) {

    public static CompanyView from(Company company) {
        return new CompanyView(
                company.getId(),
                company.getPropertyId(),
                company.getCode(),
                company.getName(),
                company.getTaxId(),
                company.getEmail(),
                company.getPhone(),
                company.getStatus(),
                company.getCreatedAt(),
                company.getUpdatedAt());
    }
}
