package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.domain.GuestProfile;
import com.pms.hotelboutique.backend.modules.reservations.domain.Reservation;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.GuestProfileRepository;
import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.ReservationRepository;
import jakarta.validation.Valid;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@Transactional
public class ReservationServiceImpl implements ReservationService {

    private static final int CODE_LENGTH = 10;
    private static final int CODE_ATTEMPTS = 5;
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final ReservationRepository reservations;
    private final GuestProfileRepository profiles;
    private final SecureRandom random = new SecureRandom();

    public ReservationServiceImpl(ReservationRepository reservations, GuestProfileRepository profiles) {
        this.reservations = reservations;
        this.profiles = profiles;
    }

    @Override
    public ReservationView create(@Valid CreateReservationCommand command) {
        Instant now = Instant.now();
        Reservation reservation = new Reservation(UUID.randomUUID(), command.propertyId(),
                nextConfirmationCode(), command.currency(), command.sourceChannel(), now);
        if (command.bookingGuestId() != null) {
            GuestProfile bookingGuest = profiles.findById(command.bookingGuestId())
                    .orElseThrow(() -> new ReservationException("booking guest profile not found"));
            reservation.linkBookingGuest(bookingGuest);
        }
        reservation.updateSource(blankToNull(command.sourceReference()), blankToNull(command.notes()), now);
        // Property existence is enforced by the FK to properties (owned by
        // BD1, no JPA read model to reuse); no parallel lookup is kept here.
        return ReservationView.from(reservations.save(reservation));
    }

    @Override
    public ReservationView confirm(UUID reservationId) {
        Reservation reservation = existing(reservationId);
        try {
            reservation.confirm(Instant.now());
        } catch (IllegalStateException e) {
            throw new ReservationException(e.getMessage(), e);
        }
        return ReservationView.from(reservation);
    }

    @Override
    public ReservationView cancel(UUID reservationId) {
        Reservation reservation = existing(reservationId);
        try {
            reservation.cancel(Instant.now());
        } catch (IllegalStateException e) {
            throw new ReservationException(e.getMessage(), e);
        }
        return ReservationView.from(reservation);
    }

    @Override
    @Transactional(readOnly = true)
    public ReservationView get(UUID reservationId) {
        return ReservationView.from(existing(reservationId));
    }

    private Reservation existing(UUID reservationId) {
        if (reservationId == null) {
            throw new ReservationException("reservation id is required");
        }
        return reservations.findById(reservationId)
                .orElseThrow(() -> new ReservationException("reservation not found"));
    }

    private String nextConfirmationCode() {
        for (int attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
            String candidate = randomCode();
            if (reservations.findByConfirmationCode(candidate).isEmpty()) {
                return candidate;
            }
        }
        throw new ReservationException("could not allocate a confirmation code");
    }

    private String randomCode() {
        StringBuilder code = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            code.append(CODE_ALPHABET.charAt(random.nextInt(CODE_ALPHABET.length())));
        }
        return code.toString();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
