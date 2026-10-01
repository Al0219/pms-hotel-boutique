package com.pms.hotelboutique.backend.modules.reservations.application;

/** Domain-facing failure for audit operations. */
public class AuditException extends RuntimeException {

    public AuditException(String message) {
        super(message);
    }

    public AuditException(String message, Throwable cause) {
        super(message, cause);
    }
}
