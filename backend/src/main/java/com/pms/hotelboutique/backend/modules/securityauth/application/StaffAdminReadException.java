package com.pms.hotelboutique.backend.modules.securityauth.application;

public class StaffAdminReadException extends RuntimeException {
    public enum Failure {
        INVALID_REQUEST(400, "Invalid Staff request"), INVALID_CURSOR(400, "Invalid Staff cursor"),
        STAFF_SESSION_REQUIRED(401, "Staff session required"), STAFF_ACCESS_DENIED(403, "Staff access denied"),
        STAFF_USER_NOT_FOUND(404, "Staff user not found"), STAFF_READ_UNAVAILABLE(503, "Staff read unavailable");
        public final int status;
        public final String title;
        Failure(int status, String title) { this.status = status; this.title = title; }
    }
    private final Failure failure;
    public StaffAdminReadException(Failure failure) { super(failure.name()); this.failure = failure; }
    public Failure failure() { return failure; }
}
