package com.pms.hotelboutique.backend.modules.reservations.application;

/** Domain-facing failure for Reservation operations. */
public class ReservationException extends RuntimeException {

    public ReservationException(String message) {
        super(message);
    }

    public ReservationException(String message, Throwable cause) {
        super(message, cause);
    }
}
