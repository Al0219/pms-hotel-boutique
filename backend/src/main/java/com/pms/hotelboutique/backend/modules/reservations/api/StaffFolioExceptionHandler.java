package com.pms.hotelboutique.backend.modules.reservations.api;

import com.pms.hotelboutique.backend.modules.reservations.application.*;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice(assignableTypes = StaffFolioController.class)
public class StaffFolioExceptionHandler extends ResponseEntityExceptionHandler {
    @ExceptionHandler(StaffFolioHttpService.Conflict.class)
    ResponseEntity<ProblemDetail> conflict(StaffFolioHttpService.Conflict error) { return problem(409, "Payment unavailable", error.code()); }
    @ExceptionHandler(LocalOperationConflictException.class)
    ResponseEntity<ProblemDetail> reused() { return problem(409, "Operation key reused", "IDEMPOTENCY_KEY_REUSED"); }
    @ExceptionHandler(ReservationQueryException.class)
    ResponseEntity<ProblemDetail> missing() { return problem(404, "Folio not found", null); }
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ProblemDetail> invalid() { return problem(400, "Invalid folio parameters", null); }
    @ExceptionHandler(StaffAuthenticationException.class)
    ResponseEntity<ProblemDetail> unauthorized() { return problem(401, "Staff session required", null); }
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ProblemDetail> forbidden() { return problem(403, "Folio access denied", null); }
    @Override protected ResponseEntity<Object> createResponseEntity(Object body, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        var result = new HttpHeaders(); result.addAll(headers); result.setCacheControl("private, no-store");
        return super.createResponseEntity(body, result, status, request);
    }
    private static ResponseEntity<ProblemDetail> problem(int status, String title, String code) {
        var result = ProblemDetail.forStatus(status); result.setTitle(title);
        if (code != null) result.setProperty("code", code);
        return ResponseEntity.status(status).header("Cache-Control", "private, no-store").body(result);
    }
}
