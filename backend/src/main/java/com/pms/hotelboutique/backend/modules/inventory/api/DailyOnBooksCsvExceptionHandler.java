package com.pms.hotelboutique.backend.modules.inventory.api;

import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice(assignableTypes = DailyOnBooksCsvController.class)
public class DailyOnBooksCsvExceptionHandler {
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ProblemDetail> invalid(IllegalArgumentException exception) {
        return problem(HttpStatus.BAD_REQUEST, "Invalid report filters");
    }

    @ExceptionHandler(StaffAuthenticationException.class)
    ResponseEntity<ProblemDetail> unauthenticated(StaffAuthenticationException exception) {
        return problem(HttpStatus.UNAUTHORIZED, "Staff session required");
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ProblemDetail> forbidden(AccessDeniedException exception) {
        return problem(HttpStatus.FORBIDDEN, "Report unavailable");
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> unavailable(Exception exception) {
        return problem(HttpStatus.SERVICE_UNAVAILABLE, "Report unavailable");
    }

    private ResponseEntity<ProblemDetail> problem(HttpStatus status, String title) {
        var problem = ProblemDetail.forStatus(status);
        problem.setTitle(title);
        return ResponseEntity.status(status).contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store").body(problem);
    }
}
