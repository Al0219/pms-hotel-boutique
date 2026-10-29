package com.pms.hotelboutique.backend.modules.operations.api;
import com.pms.hotelboutique.backend.modules.guestauth.api.GuestValetController;
import org.springframework.dao.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
/** Database uniqueness/concurrency is the final authority; never expose SQL or plate/identity values. */
@RestControllerAdvice(assignableTypes={GuestValetController.class,StaffValetController.class,StaffValetVehicleController.class})
public class ValetIntegrityExceptionHandler {
 @ExceptionHandler({DataIntegrityViolationException.class,ConcurrencyFailureException.class})
 public ProblemDetail conflict(){var p=ProblemDetail.forStatus(HttpStatus.CONFLICT);p.setTitle("Vehicle, association or request changed");return p;}
 // Write the scoped ProblemDetail directly. sendError would redispatch to /error
 // and replace the Guest business status with the default authentication entry point.
 @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
 public ProblemDetail business(org.springframework.web.server.ResponseStatusException ex){
  var p=ProblemDetail.forStatus(ex.getStatusCode());p.setTitle(ex.getStatusCode().value()==404?"Valet resource unavailable":ex.getStatusCode().value()==409?"Vehicle, association or request changed":"Invalid valet input");return p;
 }
 @ExceptionHandler({org.springframework.web.bind.MethodArgumentNotValidException.class,
   org.springframework.web.bind.ServletRequestBindingException.class,
   org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
   org.springframework.http.converter.HttpMessageNotReadableException.class})
 public ProblemDetail invalid(){var p=ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);p.setTitle("Invalid valet input");return p;}

}
