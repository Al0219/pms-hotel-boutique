package com.pms.hotelboutique.backend.modules.operations.application;

/** Domain-facing failure for night audit operations. */
public class NightAuditException extends RuntimeException {

    public NightAuditException(String message) {
        super(message);
    }

    public NightAuditException(String message, Throwable cause) {
        super(message, cause);
    }
}
