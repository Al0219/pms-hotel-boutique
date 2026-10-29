package com.pms.hotelboutique.backend.modules.operations.api;

import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.TransactionException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = CurrentHousekeepingReportController.class)
public class CurrentHousekeepingReportExceptionHandler {
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ProblemDetail> invalidFilters(IllegalArgumentException exception) {
        return problem(HttpStatus.BAD_REQUEST, "Invalid report filters");
    }

    @ExceptionHandler({DataAccessException.class, TransactionException.class})
    ResponseEntity<ProblemDetail> unavailable(RuntimeException exception) {
        return problem(HttpStatus.SERVICE_UNAVAILABLE, "Report unavailable");
    }

    private ResponseEntity<ProblemDetail> problem(HttpStatus status, String title) {
        var problem = ProblemDetail.forStatus(status);
        problem.setTitle(title);
        return ResponseEntity.status(status).header("Cache-Control", "private, no-store").body(problem);
    }
}
