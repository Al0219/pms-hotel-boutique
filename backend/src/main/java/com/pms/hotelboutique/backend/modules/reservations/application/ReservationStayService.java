package com.pms.hotelboutique.backend.modules.reservations.application;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

/**
 * BD3 stay and occupant operations (Fase 3).
 *
 * Room inventory belongs to BD2 and is referenced by id only; availability
 * checks and atomic consumption arrive with the Fase 4 creation flow.
 */
public interface ReservationStayService {

    ReservationStayView addStay(@Valid CreateStayCommand command);

    ReservationStayView assignRoom(UUID stayId, UUID roomId);

    ReservationStayView checkIn(UUID stayId);

    ReservationStayView checkOut(UUID stayId);

    ReservationStayView cancelStay(UUID stayId);

    ReservationStayView markNoShow(UUID stayId);

    ReservationStayView addOccupant(UUID stayId, UUID profileId, boolean primary);

    void removeOccupant(UUID stayId, UUID linkId);

    ReservationStayView get(UUID stayId);

    List<ReservationStayView> listByReservation(UUID reservationId);
}
