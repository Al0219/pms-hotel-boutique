package com.pms.hotelboutique.backend.modules.securityauth.api;

import com.pms.hotelboutique.backend.modules.securityauth.application.*;
import java.sql.SQLException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import static com.pms.hotelboutique.backend.modules.securityauth.application.StaffAdminMutationException.Failure.*;

@RestControllerAdvice(assignableTypes={StaffAdminMutationController.class,StaffInvitationController.class,StaffInvitationConsumeController.class})
@Order(Ordered.HIGHEST_PRECEDENCE)
public class StaffAdminMutationExceptionHandler {
    @ExceptionHandler(StaffAdminMutationException.class)
    ResponseEntity<StaffAdminMutationModels.Error> command(StaffAdminMutationException ex){return error(ex.failure(),ex.failure().status);}
    @ExceptionHandler(StaffAdminReadException.class)
    ResponseEntity<StaffAdminMutationModels.Error> query(StaffAdminReadException ex){return error(INVALID_REQUEST,400);}
    @ExceptionHandler(StaffAuthenticationException.class)
    ResponseEntity<StaffAdminMutationModels.Error> auth(StaffAuthenticationException ex){return error(STAFF_SESSION_REQUIRED,401);}
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<StaffAdminMutationModels.Error> transport(ResponseStatusException ex){return error(INVALID_REQUEST,ex.getStatusCode().value());}
    @ExceptionHandler(Exception.class)
    ResponseEntity<StaffAdminMutationModels.Error> unavailable(Exception ex){
        for(Throwable cause=ex;cause!=null;cause=cause.getCause())
            if(cause instanceof SQLException sql&&"23505".equals(sql.getSQLState())&&sql.getMessage()!=null
                &&(sql.getMessage().contains("uq_staff_users_work_email_normalized")||sql.getMessage().contains("staff_users_work_email_key")))return error(STAFF_EMAIL_CONFLICT,409);
        for(Throwable cause=ex;cause!=null;cause=cause.getCause())
            if(cause instanceof SQLException sql&&"23505".equals(sql.getSQLState())&&sql.getMessage()!=null&&sql.getMessage().contains("staff_users_username_key"))return error(STAFF_USERNAME_CONFLICT,409);
        return error(STAFF_WRITE_UNAVAILABLE,503);
    }
    private ResponseEntity<StaffAdminMutationModels.Error> error(StaffAdminMutationException.Failure failure,int status){
        return ResponseEntity.status(status).contentType(MediaType.APPLICATION_PROBLEM_JSON).header("Cache-Control","private, no-store")
                .body(new StaffAdminMutationModels.Error("about:blank",failure.title,status,failure.name()));
    }
}
