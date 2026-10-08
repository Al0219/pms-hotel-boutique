package com.pms.hotelboutique.backend.modules.operations.application;

/** Domain-facing failure for OOO/OOS outage operations. */
public class OutageException extends RuntimeException {

    public OutageException(String message) {
        super(message);
    }

    public OutageException(String message, Throwable cause) {
        super(message, cause);
    }
}
