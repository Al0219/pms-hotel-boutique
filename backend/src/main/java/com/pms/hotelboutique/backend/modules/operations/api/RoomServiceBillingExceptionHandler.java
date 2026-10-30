package com.pms.hotelboutique.backend.modules.operations.api;
import com.pms.hotelboutique.backend.modules.guestauth.api.GuestRoomServiceController;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
@RestControllerAdvice(assignableTypes={StaffRoomServiceController.class,GuestRoomServiceController.class})
public class RoomServiceBillingExceptionHandler {
 @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
 public ProblemDetail problem(org.springframework.web.server.ResponseStatusException e){var p=ProblemDetail.forStatus(e.getStatusCode());p.setTitle("Room Service operation unavailable");if(e.getReason()!=null&&e.getReason().matches("[A-Z_]{1,64}"))p.setProperty("code",e.getReason());return p;}
}
