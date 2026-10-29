package com.pms.hotelboutique.backend.modules.guestauth.api;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestControllerAdvice(assignableTypes=GuestPersonalProfileController.class)
public class GuestPersonalProfileExceptionHandler {
    @ExceptionHandler({org.springframework.web.bind.MethodArgumentNotValidException.class,org.springframework.http.converter.HttpMessageNotReadableException.class})
    ResponseEntity<ProblemDetail> invalid() { return problem(400); }
    @ExceptionHandler({org.springframework.dao.DataAccessException.class,org.springframework.transaction.TransactionException.class})
    ResponseEntity<ProblemDetail> unavailable() { return problem(503); }
    private ResponseEntity<ProblemDetail> problem(int status) { var p=ProblemDetail.forStatus(status);p.setTitle("Personal profile unavailable");return ResponseEntity.status(status).cacheControl(CacheControl.noStore().cachePrivate()).body(p); }
}
