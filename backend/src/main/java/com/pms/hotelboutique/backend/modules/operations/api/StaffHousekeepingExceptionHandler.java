package com.pms.hotelboutique.backend.modules.operations.api;

import com.pms.hotelboutique.backend.modules.operations.application.StaffHousekeepingService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice(assignableTypes = StaffHousekeepingController.class)
public class StaffHousekeepingExceptionHandler extends ResponseEntityExceptionHandler {
    @ExceptionHandler(StaffHousekeepingService.NotFound.class)
    ProblemDetail missing() { return problem(HttpStatus.NOT_FOUND, "Housekeeping room not found"); }
    @ExceptionHandler(StaffHousekeepingService.Conflict.class)
    ProblemDetail conflict() { return problem(HttpStatus.CONFLICT, "Housekeeping state changed; refresh before retrying"); }
    @ExceptionHandler(IllegalArgumentException.class)
    ProblemDetail invalid() { return problem(HttpStatus.BAD_REQUEST, "Invalid housekeeping request"); }
    @ExceptionHandler(StaffAuthenticationException.class)
    ProblemDetail unauthorized() { return problem(HttpStatus.UNAUTHORIZED, "Staff session required"); }
    @ExceptionHandler(AccessDeniedException.class)
    ProblemDetail forbidden() { return problem(HttpStatus.FORBIDDEN, "Housekeeping access denied"); }
    private static ProblemDetail problem(HttpStatus status, String title) {
        var problem = ProblemDetail.forStatus(status); problem.setTitle(title); return problem;
    }
}
