package com.pms.hotelboutique.backend.modules.guestauth.api;

import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.guestauth.application.ReservationLinkOtpService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Guest-only, BFF-facing challenge endpoints. Never returns a reservation or email. */
@RestController
@Validated
@RequestMapping("/api/v1/guest-auth/reservation-links")
@Tag(name = "Guest reservation links")
public class ReservationLinkController {
    private final ReservationLinkOtpService links;

    public ReservationLinkController(ReservationLinkOtpService links) {
        this.links = links;
    }

    @PostMapping("/challenges")
    @Operation(summary = "Request an OTP for a historical reservation")
    public ResponseEntity<ChallengeResponse> issue(@AuthenticationPrincipal GuestPrincipal principal,
            @Valid @RequestBody ChallengeRequest request) {
        return ResponseEntity.accepted().body(new ChallengeResponse(
                links.issue(principal, request.confirmationCode())));
    }

    @PostMapping("/verify")
    @Operation(summary = "Verify OTP and link one reservation to the Guest account")
    public ResponseEntity<?> verify(@AuthenticationPrincipal GuestPrincipal principal,
            @RequestBody VerifyRequest request) {
        if (links.verify(principal, request.requestId(), request.otp())) {
            return ResponseEntity.noContent().build();
        }
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.UNPROCESSABLE_ENTITY);
        problem.setTitle("Reservation link verification failed");
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(problem);
    }

    public record ChallengeRequest(@NotBlank @Size(max = 16) String confirmationCode) { }

    public record ChallengeResponse(UUID requestId) { }

    public record VerifyRequest(UUID requestId, String otp) { }
}
