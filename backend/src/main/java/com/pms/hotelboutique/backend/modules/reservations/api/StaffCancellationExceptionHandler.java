package com.pms.hotelboutique.backend.modules.reservations.api;

import com.pms.hotelboutique.backend.modules.reservations.application.*;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice(assignableTypes=StaffReservationCancellationController.class)
public class StaffCancellationExceptionHandler extends ResponseEntityExceptionHandler {
    @ExceptionHandler(StaffReservationCancellationService.Conflict.class)
    ResponseEntity<ProblemDetail> conflict(StaffReservationCancellationService.Conflict error) { return response(409,error.code()); }
    @ExceptionHandler(LocalOperationConflictException.class)
    ResponseEntity<ProblemDetail> reused() { return response(409,"IDEMPOTENCY_KEY_REUSED"); }
    @ExceptionHandler(ReservationQueryException.class)
    ResponseEntity<ProblemDetail> missing() { return response(404,"RESERVATION_NOT_FOUND"); }
    @ExceptionHandler(StaffAuthenticationException.class)
    ResponseEntity<ProblemDetail> unauthorized() { return response(401,"STAFF_SESSION_REQUIRED"); }
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ProblemDetail> forbidden() { return response(403,"CANCELLATION_FORBIDDEN"); }
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ProblemDetail> invalid() { return response(400,"INVALID_REQUEST"); }
    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> failed() { return response(500,"CANCELLATION_FAILED"); }
    private static ResponseEntity<ProblemDetail> response(int status,String code) {
        var problem=ProblemDetail.forStatus(status); problem.setTitle("Cancellation unavailable"); problem.setProperty("code",code);
        return ResponseEntity.status(status).header("Cache-Control","private, no-store").body(problem);
    }
    @Override protected ResponseEntity<Object> createResponseEntity(Object body,HttpHeaders headers,HttpStatusCode status,
            org.springframework.web.context.request.WebRequest request) {
        var result=new HttpHeaders(); result.addAll(headers); result.setCacheControl("private, no-store");
        return super.createResponseEntity(body,result,status,request);
    }
}
