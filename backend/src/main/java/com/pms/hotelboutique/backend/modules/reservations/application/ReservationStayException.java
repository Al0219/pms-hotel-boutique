package com.pms.hotelboutique.backend.modules.reservations.application;

/** Domain-facing failure for ReservationStay operations. */
public class ReservationStayException extends RuntimeException {

    public ReservationStayException(String message) {
        super(message);
    }

    public ReservationStayException(String message, Throwable cause) {
        super(message, cause);
    }
}
