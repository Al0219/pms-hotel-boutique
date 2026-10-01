package com.pms.hotelboutique.backend.modules.inventory.api;

import com.pms.hotelboutique.backend.modules.inventory.application.InventoryNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice(assignableTypes = InventoryController.class)
public class InventoryExceptionHandler extends ResponseEntityExceptionHandler {
    @ExceptionHandler(IllegalArgumentException.class)
    ProblemDetail invalidRange(IllegalArgumentException exception) {
        var problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Invalid stay date range");
        return problem;
    }

    @ExceptionHandler(InventoryNotFoundException.class)
    ProblemDetail missingRoomType(InventoryNotFoundException exception) {
        var problem = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
        problem.setTitle("Room type not found in the authorized property");
        return problem;
    }
}
