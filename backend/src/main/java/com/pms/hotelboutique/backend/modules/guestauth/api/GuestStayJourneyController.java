package com.pms.hotelboutique.backend.modules.guestauth.api;
import com.pms.hotelboutique.backend.modules.reservations.application.StayJourneyService;
import com.pms.hotelboutique.backend.modules.reservations.application.StayJourneyService.*;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.responses.*;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping(value="/api/v1/guest-auth/account/reservations/{reservationId}/stays/{stayId}/journey",produces="application/json")
@Tag(name="Stay journey")
@SecurityRequirement(name="guestBearerAuth")
@ApiResponses({@ApiResponse(responseCode="400",description="Invalid closed request",content=@Content),@ApiResponse(responseCode="401",description="Active session required",content=@Content),@ApiResponse(responseCode="403",description="Permission or property denied",content=@Content),@ApiResponse(responseCode="404",description="Resource unavailable",content=@Content),@ApiResponse(responseCode="409",description="State, financial scenario, concurrency or key conflict",content=@Content)})
public class GuestStayJourneyController {
 private final StayJourneyService service; public GuestStayJourneyController(StayJourneyService service){this.service=service;}
 private <T> ResponseEntity<T> ok(T body){return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(body);}
 @GetMapping("/state")
 @Operation(summary="Estado operativo y versión de estancia sin revelar finanzas")
 @ApiResponse(responseCode="200",description="Authorized stay version, property current date and requests")
 public ResponseEntity<State> state(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId){return ok(service.guestState(p,reservationId,stayId));}
 @GetMapping("/requests")
 @Operation(summary="Solicitudes de entrada y salida")
 @ApiResponse(responseCode="200",description="Persisted authorized result")
 public ResponseEntity<List<Request>> requests(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId){return ok(service.guestRequests(p,reservationId,stayId));}
 @GetMapping("/summary")
 @Operation(summary="Folio GTQ real para reserva estándar")
 @ApiResponse(responseCode="200",description="Persisted authorized result")
 public ResponseEntity<Summary> summary(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId){return ok(service.guestSummary(p,reservationId,stayId));}
 @GetMapping("/document")
 @Operation(summary="Snapshot inmutable del documento informativo")
 @ApiResponse(responseCode="200",description="Persisted authorized result")
 public ResponseEntity<Document> document(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId){return ok(service.guestDocument(p,reservationId,stayId));}
 @PostMapping(value="/payments",consumes="application/json")
 @Operation(summary="Pago simulado por abono o total",description="Synthetic token only, never PAN/CVV. GTQ, one standard stay and one GUEST folio. Same key/payload replays even after balance zero; negative simulated outcomes persist without PAYMENT. Guest financial ownership or Staff FOLIO_PAYMENT_OPERATE required.")
 @ApiResponse(responseCode="200",description="Immutable payment attempt receipt; APPROVED, DECLINED or ERROR")
 public ResponseEntity<Payment> pay(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId,@RequestHeader("Idempotency-Key") String key,@RequestBody PaymentInput input){return ok(service.guestPay(p,reservationId,stayId,key,input));}
 @PostMapping(value="/requests",consumes="application/json")
 @Operation(summary="Solicitar entrada o salida sin completar estancia",description="CHECK_IN from property arrival date, confirmed reservation. CHECK_OUT may be requested early only with a verifiable zero balance and no pending or unposted billable services; conflicts return409 without mutations. Only Staff completes. One OPEN per stay/kind. Guest financial responsibility required for checkout.")
 @ApiResponse(responseCode="200",description="Persisted request, original identity on replay")
 public ResponseEntity<Request> request(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId,@RequestHeader("Idempotency-Key") String key,@RequestBody RequestInput input){return ok(service.request(p,reservationId,stayId,key,input));}
 @GetMapping("/document-file")
 @Operation(summary="Recuperar bytes originales del PDF",description="404 until explicitly issued; never regenerates a stored PDF.")
 @ApiResponse(responseCode="200",description="Immutable PDF base64, SHA-256 and document identity")
 public ResponseEntity<DocumentFile> file(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId){return ok(service.guestFile(p,reservationId,stayId,false));}
 @PostMapping("/document-file")
 @Operation(summary="Emitir PDF informativo una sola vez",description="Confirmed checkout, settled immutable snapshot; concurrent requests return identical stored bytes. Historical snapshots without a file remain unissued until this explicit operation.")
 @ApiResponse(responseCode="200",description="Original stored PDF, including replays")
 public ResponseEntity<DocumentFile> issue(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId){return ok(service.guestFile(p,reservationId,stayId,true));}
}
