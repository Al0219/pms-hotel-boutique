package com.pms.hotelboutique.backend.modules.reservations.api;
import com.pms.hotelboutique.backend.modules.guestauth.api.GuestStayJourneyController;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;
@RestControllerAdvice(assignableTypes={GuestStayJourneyController.class,StaffStayJourneyController.class})
public class StayJourneyExceptionHandler {
 @ExceptionHandler(ResponseStatusException.class) public ProblemDetail business(ResponseStatusException e){var p=ProblemDetail.forStatus(e.getStatusCode());p.setTitle("Stay operation unavailable");if(e.getReason()!=null&&e.getReason().matches("[A-Z_]{1,64}"))p.setProperty("code",e.getReason());return p;}
 @ExceptionHandler({IllegalArgumentException.class,org.springframework.http.converter.HttpMessageNotReadableException.class,org.springframework.web.bind.ServletRequestBindingException.class,org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class}) public ProblemDetail invalid(){return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,"Invalid stay request");}
 @ExceptionHandler({com.pms.hotelboutique.backend.modules.guestauth.application.GuestAuthenticationException.class,com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException.class}) public ProblemDetail session(){return ProblemDetail.forStatus(HttpStatus.UNAUTHORIZED);}
 @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class) public ProblemDetail denied(){return ProblemDetail.forStatus(HttpStatus.FORBIDDEN);}
 @ExceptionHandler({org.springframework.dao.DataIntegrityViolationException.class,org.springframework.dao.ConcurrencyFailureException.class}) public ProblemDetail conflict(){return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,"Operation changed");}
}
