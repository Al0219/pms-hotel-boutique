package com.pms.hotelboutique.backend.modules.guestauth.application;

public class PublicReservationLookupException extends RuntimeException {
    private final int status;
    public PublicReservationLookupException(int status) { super("Reservation lookup unavailable"); this.status=status; }
    public int status() { return status; }
}
