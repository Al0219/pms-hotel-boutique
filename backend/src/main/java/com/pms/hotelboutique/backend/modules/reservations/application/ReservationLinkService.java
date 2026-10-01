package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.guestauth.application.ReservationLinkVerificationPort;
import com.pms.hotelboutique.backend.modules.reservations.domain.GuestProfile;
import com.pms.hotelboutique.backend.modules.reservations.domain.Reservation;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationRepository;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * BD3 implementation of BD1's {@link ReservationLinkVerificationPort} (C3).
 *
 * Resolves a confirmation code plus contact email to a reservation link for
 * the future OTP challenge. Answers are existence-safe: unknown codes,
 * missing bookers and mismatched emails all yield {@link Optional#empty()},
 * so callers cannot probe which reservations exist. OTP issuance/attempts
 * stay with BE-004 once it consumes this lookup.
 */
@Service
@Transactional(readOnly = true)
public class ReservationLinkService implements ReservationLinkVerificationPort {

    private final ReservationRepository reservations;

    public ReservationLinkService(ReservationRepository reservations) {
        this.reservations = reservations;
    }

    public Optional<ReservationLink> verifyLink(String confirmationCode, String contactEmail) {
        if (confirmationCode == null || confirmationCode.isBlank()
                || contactEmail == null || contactEmail.isBlank()) {
            return Optional.empty();
        }
        Optional<Reservation> reservation =
                reservations.findByConfirmationCode(confirmationCode.trim());
        if (reservation.isEmpty()) {
            return Optional.empty();
        }
        GuestProfile booker = reservation.get().getBookingGuest();
        if (booker == null || booker.getEmail() == null) {
            return Optional.empty();
        }
        if (booker.getEmail().trim().equalsIgnoreCase(contactEmail.trim())) {
            return Optional.of(new ReservationLink(reservation.get().getId(), booker.getId()));
        }
        return Optional.empty();
    }

    public record ReservationLink(UUID reservationId, UUID guestProfileId) {
    }
}
