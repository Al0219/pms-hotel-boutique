package com.pms.hotelboutique.backend.modules.reservations.application;

/** Domain-facing failure for Folio operations. */
public class FolioException extends RuntimeException {

    public FolioException(String message) {
        super(message);
    }

    public FolioException(String message, Throwable cause) {
        super(message, cause);
    }
}
