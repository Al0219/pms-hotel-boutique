package com.pms.hotelboutique.backend.modules.securityauth.application;

public class StaffAdminMutationException extends RuntimeException {
    public enum Failure {
        INVALID_REQUEST(400,"Invalid Staff request"), STAFF_SESSION_REQUIRED(401,"Staff session required"),
        STAFF_ACCESS_DENIED(403,"Staff access denied"), STAFF_USER_NOT_FOUND(404,"Staff user not found"),
        STAFF_VERSION_CONFLICT(409,"Staff version conflict"), STAFF_EMAIL_CONFLICT(409,"Staff email unavailable"),
        STAFF_STATE_CONFLICT(409,"Staff state conflict"), STAFF_WRITE_UNAVAILABLE(503,"Staff write unavailable");
        public final int status; public final String title;
        Failure(int status,String title){this.status=status;this.title=title;}
    }
    private final Failure failure;
    public StaffAdminMutationException(Failure failure){super(failure.name());this.failure=failure;}
    public Failure failure(){return failure;}
}
