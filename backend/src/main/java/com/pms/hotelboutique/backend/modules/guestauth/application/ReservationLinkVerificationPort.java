package com.pms.hotelboutique.backend.modules.guestauth.application;

import java.util.Optional;
import java.util.UUID;

/**
 * Existence-safe internal lookup implemented by Reservations. The recipient
 * never leaves the Backend or becomes a caller-supplied destination.
 */
public interface ReservationLinkVerificationPort {
    Optional<LinkCandidate> findCandidate(String confirmationCode, String verifiedAccountEmail);

    record LinkCandidate(UUID reservationId, UUID propertyId, UUID bookingGuestProfileId,
            String recipientEmail) { }
}
