package com.pms.hotelboutique.backend.modules.guestauth.api;

import com.pms.hotelboutique.backend.modules.guestauth.application.PublicReservationLookupException;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice(assignableTypes=PublicReservationLookupController.class)
public class PublicReservationLookupExceptionHandler {
    @ExceptionHandler(PublicReservationLookupException.class)
    public ResponseEntity<ProblemDetail> lookup(PublicReservationLookupException error) { return problem(error.status()); }
    @ExceptionHandler({org.springframework.web.bind.MethodArgumentNotValidException.class,
        org.springframework.http.converter.HttpMessageNotReadableException.class,
        org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ProblemDetail> invalid() { return problem(400); }
    @ExceptionHandler({org.springframework.dao.DataAccessException.class,org.springframework.transaction.TransactionException.class})
    public ResponseEntity<ProblemDetail> unavailable() { return problem(503); }
    private ResponseEntity<ProblemDetail> problem(int status) {
        var detail=ProblemDetail.forStatus(status); detail.setTitle("Reservation lookup could not be completed");
        return ResponseEntity.status(status).header("Cache-Control","private, no-store").body(detail);
    }
}
