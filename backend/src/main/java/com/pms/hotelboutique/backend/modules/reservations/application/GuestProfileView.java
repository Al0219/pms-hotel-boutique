package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.domain.GuestProfile;
import java.time.Instant;
import java.util.UUID;

/** Read model for a {@code GuestProfile}. Entities are never exposed directly. */
public record GuestProfileView(
        UUID id,
        UUID guestAccountId,
        UUID propertyId,
        String firstName,
        String lastName,
        String email,
        String phone,
        String documentType,
        String documentNumber,
        String preferredLanguage,
        GuestProfile.Status status,
        Instant createdAt,
        Instant updatedAt) {

    public static GuestProfileView from(GuestProfile profile) {
        UUID accountId = profile.getGuestAccount() == null ? null : profile.getGuestAccount().getId();
        return new GuestProfileView(
                profile.getId(),
                accountId,
                profile.getPropertyId(),
                profile.getFirstName(),
                profile.getLastName(),
                profile.getEmail(),
                profile.getPhone(),
                profile.getDocumentType(),
                profile.getDocumentNumber(),
                profile.getPreferredLanguage(),
                profile.getStatus(),
                profile.getCreatedAt(),
                profile.getUpdatedAt());
    }
}
