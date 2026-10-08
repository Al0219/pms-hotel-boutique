package com.pms.hotelboutique.backend.modules.reservations.application;

import java.util.List;

/** Result of a transactional booking: container plus its stays. */
public record BookingView(ReservationView reservation, List<ReservationStayView> stays) {
}
