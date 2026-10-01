package com.pms.hotelboutique.backend.modules.reservations.application;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

/**
 * BD3 GuestProfile operations.
 *
 * Authentication stays in BD1: this service only links to an existing,
 * ACTIVE {@code GuestAccount} and never creates credentials or sessions.
 * No delete is offered; profiles are deactivated to preserve history.
 */
public interface GuestProfileService {

    GuestProfileView create(@Valid CreateGuestProfileCommand command);

    GuestProfileView updateContact(UUID profileId, @Valid UpdateGuestProfileCommand command);

    GuestProfileView activate(UUID profileId);

    GuestProfileView deactivate(UUID profileId);

    GuestProfileView get(UUID profileId);

    List<GuestProfileView> findByAccount(UUID accountId);
}
