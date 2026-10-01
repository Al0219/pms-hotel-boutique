package com.pms.hotelboutique.backend.modules.operations.application;

/** Domain-facing failure for housekeeping operations. */
public class HousekeepingException extends RuntimeException {

    public HousekeepingException(String message) {
        super(message);
    }

    public HousekeepingException(String message, Throwable cause) {
        super(message, cause);
    }
}
