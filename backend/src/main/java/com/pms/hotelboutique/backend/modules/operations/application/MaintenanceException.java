package com.pms.hotelboutique.backend.modules.operations.application;

/** Domain-facing failure for maintenance order operations. */
public class MaintenanceException extends RuntimeException {

    public MaintenanceException(String message) {
        super(message);
    }

    public MaintenanceException(String message, Throwable cause) {
        super(message, cause);
    }
}
