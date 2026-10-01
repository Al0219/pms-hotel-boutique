package com.pms.hotelboutique.backend.modules.commercial.application;

/** Domain failures for the BD3 commercial B2B base (F12). */
public class CommercialException extends RuntimeException {

    public CommercialException(String message) {
        super(message);
    }

    public CommercialException(String message, Throwable cause) {
        super(message, cause);
    }
}
