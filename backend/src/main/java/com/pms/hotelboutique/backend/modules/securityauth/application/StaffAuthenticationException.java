package com.pms.hotelboutique.backend.modules.securityauth.application;

public class StaffAuthenticationException extends RuntimeException {
    public StaffAuthenticationException() { super("Invalid staff authentication"); }
}
