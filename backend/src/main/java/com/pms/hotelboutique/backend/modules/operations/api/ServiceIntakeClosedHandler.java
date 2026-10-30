package com.pms.hotelboutique.backend.modules.operations.api;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.core.annotation.Order;
@RestControllerAdvice @Order(org.springframework.core.Ordered.HIGHEST_PRECEDENCE)
public class ServiceIntakeClosedHandler {
 @ExceptionHandler(com.pms.hotelboutique.backend.modules.operations.application.ServiceIntakeClosed.class)
 public ProblemDetail closed(){var p=ProblemDetail.forStatus(HttpStatus.CONFLICT);p.setProperty("code","CHECKOUT_REQUEST_PENDING");p.setDetail("Ya solicitaste tu salida. No puedes pedir más servicios.");return p;}
}
