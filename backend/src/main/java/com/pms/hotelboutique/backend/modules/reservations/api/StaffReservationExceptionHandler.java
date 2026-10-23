package com.pms.hotelboutique.backend.modules.reservations.api;

import com.pms.hotelboutique.backend.modules.reservations.application.ReservationQueryException;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice(assignableTypes = StaffReservationController.class)
public class StaffReservationExceptionHandler extends ResponseEntityExceptionHandler {
    @ExceptionHandler(com.pms.hotelboutique.backend.modules.reservations.application.StaffStayLifecycleService.Conflict.class)
    org.springframework.http.ResponseEntity<ProblemDetail> lifecycleConflict(
            com.pms.hotelboutique.backend.modules.reservations.application.StaffStayLifecycleService.Conflict error) {
        var problem = problem(HttpStatus.CONFLICT, "Stay operation unavailable");
        problem.setProperty("code", error.code());
        return org.springframework.http.ResponseEntity.status(409).header("Cache-Control", "private, no-store").body(problem);
    }

    @ExceptionHandler(com.pms.hotelboutique.backend.modules.reservations.application.LocalOperationConflictException.class)
    org.springframework.http.ResponseEntity<ProblemDetail> keyConflict() {
        var problem = problem(HttpStatus.CONFLICT, "Operation key reused");
        problem.setProperty("code", "IDEMPOTENCY_KEY_REUSED");
        return org.springframework.http.ResponseEntity.status(409).header("Cache-Control", "private, no-store").body(problem);
    }
    @ExceptionHandler(com.pms.hotelboutique.backend.modules.reservations.application.StaffRoomAssignmentService.Conflict.class)
    org.springframework.http.ResponseEntity<ProblemDetail> conflict() { return response(HttpStatus.CONFLICT, "Room assignment conflict"); }
    @ExceptionHandler(ReservationQueryException.class)
    org.springframework.http.ResponseEntity<ProblemDetail> missing() { return response(HttpStatus.NOT_FOUND, "Reservation not found"); }
    @ExceptionHandler(IllegalArgumentException.class)
    org.springframework.http.ResponseEntity<ProblemDetail> invalid() { return response(HttpStatus.BAD_REQUEST, "Invalid reservation parameters"); }
    @ExceptionHandler(StaffAuthenticationException.class)
    org.springframework.http.ResponseEntity<ProblemDetail> unauthorized() { return response(HttpStatus.UNAUTHORIZED, "Staff session required"); }
    @ExceptionHandler(AccessDeniedException.class)
    org.springframework.http.ResponseEntity<ProblemDetail> forbidden() { return response(HttpStatus.FORBIDDEN, "Reservation access denied"); }

    @Override
    protected org.springframework.http.ResponseEntity<Object> createResponseEntity(Object body,
            org.springframework.http.HttpHeaders headers, org.springframework.http.HttpStatusCode status,
            org.springframework.web.context.request.WebRequest request) {
        var privateHeaders = new org.springframework.http.HttpHeaders();
        privateHeaders.addAll(headers);
        privateHeaders.setCacheControl("private, no-store");
        return super.createResponseEntity(body, privateHeaders, status, request);
    }

    private static org.springframework.http.ResponseEntity<ProblemDetail> response(HttpStatus status, String title) {
        return org.springframework.http.ResponseEntity.status(status).header("Cache-Control", "private, no-store")
                .body(problem(status, title));
    }
    private static ProblemDetail problem(HttpStatus status, String title) {
        var problem = ProblemDetail.forStatus(status);
        problem.setTitle(title);
        return problem;
    }
}
