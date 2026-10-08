package com.pms.hotelboutique.backend.modules.inventory.api;

import com.pms.hotelboutique.backend.modules.inventory.application.DemoCurrencyMismatchException;
import com.pms.hotelboutique.backend.modules.inventory.application.DemoRateNotConfiguredException;
import com.pms.hotelboutique.backend.modules.inventory.application.PropertyNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice(assignableTypes = PublicAvailabilityController.class)
public class PublicAvailabilityExceptionHandler extends ResponseEntityExceptionHandler {
    @ExceptionHandler(IllegalArgumentException.class)
    ProblemDetail invalidQuery(IllegalArgumentException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Invalid public availability query");
    }

    @ExceptionHandler(PropertyNotFoundException.class)
    ProblemDetail missingProperty(PropertyNotFoundException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "Property unavailable");
    }

    @ExceptionHandler(DemoRateNotConfiguredException.class)
    ProblemDetail missingRate(DemoRateNotConfiguredException exception) {
        return configurationError("DEMO_RATE_NOT_CONFIGURED");
    }

    @ExceptionHandler(DemoCurrencyMismatchException.class)
    ProblemDetail incompatibleCurrency(DemoCurrencyMismatchException exception) {
        return configurationError("DEMO_CURRENCY_MISMATCH");
    }

    private ProblemDetail configurationError(String code) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR,
                "Public availability pricing configuration error");
        problem.setProperty("code", code);
        return problem;
    }
}
