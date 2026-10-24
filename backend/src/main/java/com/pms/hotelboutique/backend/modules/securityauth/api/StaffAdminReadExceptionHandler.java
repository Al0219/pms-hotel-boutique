package com.pms.hotelboutique.backend.modules.securityauth.api;

import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import org.springframework.http.*;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.bind.annotation.*;
import static com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminReadException.Failure.*;

@RestControllerAdvice(assignableTypes = StaffAdminReadController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class StaffAdminReadExceptionHandler {
    @ExceptionHandler(StaffAdminReadException.class)
    ResponseEntity<StaffAdminReadModels.Error> contracted(StaffAdminReadException ex) { return failure(ex.failure()); }
    @ExceptionHandler(StaffAuthenticationException.class)
    ResponseEntity<StaffAdminReadModels.Error> session(StaffAuthenticationException ex) { return failure(STAFF_SESSION_REQUIRED); }
    @ExceptionHandler(Exception.class)
    ResponseEntity<StaffAdminReadModels.Error> unavailable(Exception ex) { return failure(STAFF_READ_UNAVAILABLE); }
    private ResponseEntity<StaffAdminReadModels.Error> failure(StaffAdminReadException.Failure failure) {
        return ResponseEntity.status(failure.status).header("Cache-Control", "private, no-store")
                .contentType(MediaType.APPLICATION_PROBLEM_JSON).body(StaffAdminReadModels.Error.of(failure));
    }
}
