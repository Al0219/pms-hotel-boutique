package com.pms.hotelboutique.backend.modules.inventory.api;

import com.pms.hotelboutique.backend.modules.inventory.application.CatalogNotFoundException;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice(assignableTypes = {RoomTypeController.class, RoomController.class, RatePlanController.class})
public class CatalogExceptionHandler extends ResponseEntityExceptionHandler {
    @ExceptionHandler({IllegalArgumentException.class, ArithmeticException.class})
    ProblemDetail invalid(RuntimeException exception) { return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Invalid catalog data"); }

    @ExceptionHandler(CatalogNotFoundException.class)
    ProblemDetail missing(CatalogNotFoundException exception) { return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "Resource not found in the requested authorized property"); }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail integrity(DataIntegrityViolationException exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException constraint
                    && constraint.getConstraintName() != null
                    && java.util.Set.of("uq_room_types_property_code", "uq_rooms_property_code", "uq_rate_plans_property_type_code").contains(constraint.getConstraintName())) {
                return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Code already exists in this catalog");
            }
        }
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Catalog write failed");
    }
}
