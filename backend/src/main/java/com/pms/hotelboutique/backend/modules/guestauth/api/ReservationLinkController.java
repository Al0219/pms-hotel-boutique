package com.pms.hotelboutique.backend.modules.guestauth.api;

import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.guestauth.application.ReservationLinkOtpService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
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
@Tag(name = "Guest reservation links", description = "BFF-only; JWT Guest vigente. Sin permiso Staff ni propertyId del cliente.")
public class ReservationLinkController {
    private final ReservationLinkOtpService links;

    public ReservationLinkController(ReservationLinkOtpService links) {
        this.links = links;
    }

    @PostMapping("/challenges")
    @SecurityRequirement(name = "guestBearerAuth")
    @ApiResponse(responseCode = "202", description = "Desafío opaco solicitado; resultado genérico, no garantiza entrega externa.", content = @Content(mediaType = "application/json", schema = @Schema(implementation = ChallengeResponse.class)))
    @ApiResponse(responseCode = "400", description = "JSON o confirmationCode inválidos.", content = @Content)
    @ApiResponse(responseCode = "401", description = "JWT/sesión Guest inválidos.", content = @Content)
    @Operation(summary = "Request an OTP for a historical reservation", description = "Respuesta 202 incluso sin candidato; no revela reserva/correo/property. OTP de un uso, 10 minutos, 5 intentos; reenvío mínimo 60 segundos, 3 por cuenta/código/hora y 10 por cuenta/día (L-05).")
    public ResponseEntity<ChallengeResponse> issue(@Parameter(hidden = true) @AuthenticationPrincipal GuestPrincipal principal,
            @Valid @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true, content = @Content(mediaType = "application/json",
                    schema = @Schema(implementation = ChallengeRequest.class))) @RequestBody ChallengeRequest request) {
        return ResponseEntity.accepted().body(new ChallengeResponse(
                links.issue(principal, request.confirmationCode())));
    }

    @PostMapping("/verify")
    @SecurityRequirement(name = "guestBearerAuth")
    @ApiResponse(responseCode = "204", description = "Vínculo confirmado; sin cuerpo.", content = @Content)
    @ApiResponse(responseCode = "422", description = "Desafío/OTP ausente, inválido, expirado o agotado; respuesta genérica.", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "400", description = "JSON o UUID malformado.", content = @Content)
    @ApiResponse(responseCode = "401", description = "JWT/sesión Guest inválidos.", content = @Content)
    @Operation(summary = "Verify OTP and link one reservation to the Guest account", description = "requestId no prueba titularidad; valida cuenta/sesión original, OTP, expiración e intentos. No transfiere reservas de otra cuenta.")
    public ResponseEntity<?> verify(@Parameter(hidden = true) @AuthenticationPrincipal GuestPrincipal principal,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    required = true, content = @Content(mediaType = "application/json",
                    schema = @Schema(implementation = VerifyRequest.class))) @RequestBody VerifyRequest request) {
        if (links.verify(principal, request.requestId(), request.otp())) {
            return ResponseEntity.noContent().build();
        }
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.UNPROCESSABLE_ENTITY);
        problem.setTitle("Reservation link verification failed");
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(problem);
    }

    public record ChallengeRequest(@NotBlank @Size(max = 16) String confirmationCode) { }

    public record ChallengeResponse(@Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Identificador opaco; no revela reserva ni existencia.") UUID requestId) { }

    public record VerifyRequest(
            @Schema(nullable = true, description = "UUID del desafío; ausente/null produce 422.") UUID requestId,
            @Schema(nullable = true, accessMode = Schema.AccessMode.WRITE_ONLY, pattern = "[0-9]{8}", description = "OTP de 8 dígitos según el servicio. Ausente/null/incorrecto produce 422; sin ejemplos.") String otp) { }
}
