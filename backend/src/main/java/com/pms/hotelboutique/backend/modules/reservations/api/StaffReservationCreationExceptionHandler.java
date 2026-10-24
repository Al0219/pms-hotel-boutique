package com.pms.hotelboutique.backend.modules.reservations.api;

import com.pms.hotelboutique.backend.modules.reservations.application.LocalOperationConflictException;
import com.pms.hotelboutique.backend.modules.reservations.application.StaffReservationCreationService.Failure;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice(assignableTypes = StaffReservationCreationController.class)
public class StaffReservationCreationExceptionHandler extends ResponseEntityExceptionHandler {
    @ExceptionHandler(Failure.class)
    ResponseEntity<ProblemDetail> failure(Failure error) { return response(error.status(), error.code()); }
    @ExceptionHandler(LocalOperationConflictException.class)
    ResponseEntity<ProblemDetail> conflict() { return response(409, "IDEMPOTENCY_KEY_REUSED"); }
    @ExceptionHandler(StaffAuthenticationException.class)
    ResponseEntity<ProblemDetail> unauthorized() { return response(401, "STAFF_SESSION_REQUIRED"); }
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ProblemDetail> denied() { return response(403, "STAFF_ACCESS_DENIED"); }
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ProblemDetail> invalid() { return response(400, "INVALID_REQUEST"); }
    @ExceptionHandler(RuntimeException.class)
    ResponseEntity<ProblemDetail> unexpected() { return response(500, "BOOKING_FAILED"); }

    @Override
    protected ResponseEntity<Object> createResponseEntity(Object body, HttpHeaders headers,
            HttpStatusCode status, org.springframework.web.context.request.WebRequest request) {
        var copy = new HttpHeaders(); copy.addAll(headers); copy.setCacheControl("private, no-store");
        return super.createResponseEntity(body, copy, status, request);
    }
    private static ResponseEntity<ProblemDetail> response(int status, String code) {
        var body = ProblemDetail.forStatus(status); body.setTitle("Staff booking unavailable"); body.setProperty("code", code);
        return ResponseEntity.status(status).header("Cache-Control", "private, no-store").body(body);
    }
}
