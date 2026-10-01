package com.pms.hotelboutique.backend.modules.reservations.application;

/** Failure of a scope-aware reservation query (missing scope or denied access). */
public class ReservationQueryException extends RuntimeException {

    public ReservationQueryException(String message) {
        super(message);
    }
}
