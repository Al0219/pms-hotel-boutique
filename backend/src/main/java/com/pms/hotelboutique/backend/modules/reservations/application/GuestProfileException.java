package com.pms.hotelboutique.backend.modules.reservations.application;

/** Domain-facing failure for GuestProfile operations (validation, missing links). */
public class GuestProfileException extends RuntimeException {

    public GuestProfileException(String message) {
        super(message);
    }

    public GuestProfileException(String message, Throwable cause) {
        super(message, cause);
    }
}
