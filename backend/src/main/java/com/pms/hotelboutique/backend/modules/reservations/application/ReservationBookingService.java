package com.pms.hotelboutique.backend.modules.reservations.application;

import jakarta.validation.Valid;

/**
 * BD3 transactional booking flow (Fase 4).
 *
 * Composes the Fase 1-3 services in one transaction: booker profile,
 * reservation container, N stays and occupants. Availability is pre-checked
 * through BD2's query port when present; atomic consumption remains pending
 * BD2 coordination, so a pre-check pass never promises zero oversell.
 */
public interface ReservationBookingService {

    BookingView createBooking(@Valid CreateBookingCommand command);
}
