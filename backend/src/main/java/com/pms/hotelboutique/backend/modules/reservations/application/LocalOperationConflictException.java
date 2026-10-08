package com.pms.hotelboutique.backend.modules.reservations.application;

/** The same operation identity was already completed with another semantic request. */
public class LocalOperationConflictException extends RuntimeException {
    public LocalOperationConflictException() {
        super("operation key was already used with a different request");
    }
}
