package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.commercial.domain.EventGroup;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Read model for an {@code EventGroup}. Entities are never exposed directly. */
public record EventGroupView(
        UUID id,
        UUID propertyId,
        String code,
        String name,
        EventGroup.Status status,
        UUID companyId,
        UUID agencyId,
        LocalDate arrival,
        LocalDate departure,
        LocalDate cutoffDate,
        Instant createdAt,
        Instant updatedAt) {

    public static EventGroupView from(EventGroup group) {
        return new EventGroupView(
                group.getId(),
                group.getPropertyId(),
                group.getCode(),
                group.getName(),
                group.getStatus(),
                group.getCompanyId(),
                group.getAgencyId(),
                group.getArrival(),
                group.getDeparture(),
                group.getCutoffDate(),
                group.getCreatedAt(),
                group.getUpdatedAt());
    }
}
