package com.pms.hotelboutique.backend.modules.reservations.application;

/** Failure of the transactional booking flow; always rolls the booking back. */
public class ReservationBookingException extends RuntimeException {

    public ReservationBookingException(String message) {
        super(message);
    }

    public ReservationBookingException(String message, Throwable cause) {
        super(message, cause);
    }
}
