package com.pms.hotelboutique.backend.modules.operations.application;

/** Domain-facing failure for service request operations. */
public class ServiceRequestException extends RuntimeException {

    public ServiceRequestException(String message) {
        super(message);
    }

    public ServiceRequestException(String message, Throwable cause) {
        super(message, cause);
    }
}
