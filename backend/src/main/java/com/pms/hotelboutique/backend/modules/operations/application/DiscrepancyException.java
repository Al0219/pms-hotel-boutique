package com.pms.hotelboutique.backend.modules.operations.application;

/** Domain-facing failure for housekeeping discrepancy operations. */
public class DiscrepancyException extends RuntimeException {

    public DiscrepancyException(String message) {
        super(message);
    }

    public DiscrepancyException(String message, Throwable cause) {
        super(message, cause);
    }
}
