package com.pms.hotelboutique.backend.modules.guestauth.api;

import com.pms.hotelboutique.backend.modules.guestauth.application.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/guest-auth/account/reservations")
@Tag(name = "Guest reservations")
@SecurityRequirement(name = "guestBearerAuth")
public class GuestReservationController {
    private final GuestAuthService auth;
    private final GuestReservationSummaryPort summaries;
    private final GuestReservationReadPort reads;
    private final GuestReservationRecoveryService recovery;
    public GuestReservationController(GuestAuthService auth, GuestReservationReadPort reads, GuestReservationRecoveryService recovery, GuestReservationSummaryPort summaries) {
        this.summaries=summaries;
        this.auth = auth;
        this.reads = reads;
        this.recovery = recovery;
    }

    @PostMapping("/reconcile")
    @Operation(summary = "Recuperar mis vínculos confirmados", description = "Sin body ni IDs del cliente. Sesión Guest vigente y evidencia de correo verificado persistida; solo reservas CONFIRMED con correo del titular coincidente. Nunca transfiere vínculos. Idempotente y transacción independiente de creación/pago.")
    @ApiResponse(responseCode = "204", description = "Reconciliación propia terminada; no revela candidatos ajenos ni garantiza que existan reservas compatibles.", content = @Content)
    @ApiResponse(responseCode = "401", description = "Sesión/cuenta Guest no válida o no verificada.", content = @Content)
    @ApiResponse(responseCode = "503", description = "Recuperación temporalmente no disponible; reservas y pagos confirmados se conservan.", content = @Content)
    public ResponseEntity<Void> reconcile(@Parameter(hidden = true) @AuthenticationPrincipal GuestPrincipal principal) {
        try { recovery.recover(principal); }
        catch (GuestAuthenticationException invalid) { throw invalid; }
        catch (RuntimeException failure) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).cacheControl(CacheControl.noStore()).build();
        }
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    @GetMapping
    @Operation(summary = "Mis estancias vinculadas", description = "Una fila por estancia, todas las fechas/estados. Única autoridad: sesión Guest y vínculo persistido; sin accountId ni scope Staff.")
    @ApiResponse(responseCode = "200", description = "Lista propia, vacía si no hay vínculos; Cache-Control private, no-store.", content = @Content(mediaType = "application/json", array = @ArraySchema(schema = @Schema(implementation = GuestReservationReadPort.LinkedStay.class))))
    @ApiResponse(responseCode = "401", description = "Sesión Guest ausente, inválida o revocada; Staff rechazado.", content = @Content)
    public ResponseEntity<List<GuestReservationReadPort.LinkedStay>> list(
            @Parameter(hidden = true) @AuthenticationPrincipal GuestPrincipal principal) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate())
                .body(reads.list(active(principal).guestAccountId()));
    }

    @GetMapping("/{reservationId}/stays/{stayId}")
    @Operation(summary = "Mi estancia", description = "Revalida sesión y vínculo Guest, pertenencia de estancia a reserva y coherencia de propiedad en SQL. No revela datos de terceros.")
    @ApiResponse(responseCode = "200", description = "Estancia persistida; habitación null si no asignada; Cache-Control private, no-store.", content = @Content(mediaType = "application/json", schema = @Schema(implementation = GuestReservationReadPort.Stay.class)))
    @ApiResponse(responseCode = "400", description = "UUID inválido.", content = @Content)
    @ApiResponse(responseCode = "401", description = "Sesión Guest inválida o Staff.", content = @Content)
    @ApiResponse(responseCode = "404", description = "Reserva/estancia inexistente, no vinculada o combinación incorrecta; respuesta indistinguible.", content = @Content)
    public ResponseEntity<GuestReservationReadPort.Stay> stay(
            @Parameter(hidden = true) @AuthenticationPrincipal GuestPrincipal principal,
            @PathVariable UUID reservationId, @PathVariable UUID stayId) {
        var own = reads.find(active(principal).guestAccountId(), reservationId, stayId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Stay unavailable"));
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(own);
    }

    @GetMapping("/{reservationId}/summary")
    @Operation(summary="Complete summary of my linked reservation",description="Contract 63. Persisted Guest account/reservation/property link required. All stays, editorial type codes, timezone and original receipt total when available. No ledger, third-party PII, payment credentials or Staff notes.")
    @ApiResponse(responseCode="200",description="Own linked reservation summary; private, no-store.",content=@Content(mediaType="application/json",schema=@Schema(implementation=PublicReservationLookupReadPort.Result.class)))
    @ApiResponse(responseCode="400",description="Invalid reservation UUID.",content=@Content)
    @ApiResponse(responseCode="401",description="Guest session required; Staff rejected.",content=@Content)
    @ApiResponse(responseCode="404",description="Reservation missing or not linked to this account.",content=@Content)
    public ResponseEntity<PublicReservationLookupReadPort.Result> summary(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal principal,@PathVariable UUID reservationId) {
        var result=summaries.findLinked(active(principal).guestAccountId(),reservationId);
        if(result.stays().isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Reservation unavailable");
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(result);
    }

    private GuestPrincipal active(GuestPrincipal principal) {
        if (principal == null) throw new GuestAuthenticationException();
        return auth.getActivePrincipal(principal);
    }
}
