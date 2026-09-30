package com.pms.hotelboutique.backend.modules.reservations.application;

import jakarta.validation.Valid;
import java.util.UUID;

/**
 * BD3 Reservation container operations (Fase 2).
 *
 * Stay management belongs to Fase 3. Inventory consumption belongs to BD2
 * and is never duplicated here. No delete is offered.
 */
public interface ReservationService {

    ReservationView create(@Valid CreateReservationCommand command);

    ReservationView confirm(UUID reservationId);

    ReservationView cancel(UUID reservationId);

    ReservationView get(UUID reservationId);
}
