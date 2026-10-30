package com.pms.hotelboutique.backend.modules.guestauth.api;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.operations.application.TransferRequestService;
import com.pms.hotelboutique.backend.modules.operations.application.TransferModels.*;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(value="/api/v1/guest-auth/account/reservations/{reservationId}/stays/{stayId}",produces="application/json")
@Tag(name="Guest transfers")
@SecurityRequirement(name="guestBearerAuth")
@ApiResponse(responseCode="400",description="Invalid body, route, passengers or schedule",content=@Content)
@ApiResponse(responseCode="401",description="Active authentication required",content=@Content)
@ApiResponse(responseCode="404",description="Transfer or linked stay unavailable",content=@Content)
public class GuestTransferController {
    private final TransferRequestService service;
    public GuestTransferController(TransferRequestService service) { this.service=service; }
    @GetMapping("/transfer-prices") @Operation(summary="Tarifas GTQ del catálogo Demo")
    public ResponseEntity<List<RoutePrice>> prices(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId){return ok(service.prices(p,reservationId,stayId));}
    @GetMapping("/transfer-catalog")
    @Operation(summary="Catálogo Traslados de mi estancia",description="Persisted transfer; property scope, active authentication, schedule30min, OPEN edit/cancel before25min. No charges or transport provider confirmation.")
    @ApiResponse(responseCode="200",description="Persisted result or idempotent replay",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(array=@ArraySchema(schema=@Schema(implementation=Product.class))))
    public ResponseEntity<List<Product>> catalog(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId) { return ok(service.catalog(p,reservationId,stayId)); }
    @GetMapping("/transfer-requests")
    @Operation(summary="Mis pedidos Traslados",description="Persisted transfer; property scope, active authentication, schedule30min, OPEN edit/cancel before25min. No charges or transport provider confirmation.")
    @ApiResponse(responseCode="200",description="Persisted result or idempotent replay",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(array=@ArraySchema(schema=@Schema(implementation=Order.class))))
    public ResponseEntity<List<Order>> list(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId) { return ok(service.list(p,reservationId,stayId)); }
    @PostMapping("/transfer-requests")
    @Operation(summary="Crear pedido Traslados",description="Persisted transfer; property scope, active authentication, schedule30min, OPEN edit/cancel before25min. No charges or transport provider confirmation.")
    @ApiResponse(responseCode="201",description="Created OPEN",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(schema=@Schema(implementation=Order.class)))
    @ApiResponse(responseCode="200",description="Persisted result or idempotent replay",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(schema=@Schema(implementation=Order.class)))
    @ApiResponse(responseCode="409",description="State, version, stay, cutoff or idempotency conflict",content=@Content)
    public ResponseEntity<Order> create(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId,
            @RequestHeader("Idempotency-Key") @Parameter(required=true,schema=@Schema(minLength=16,maxLength=100,pattern="[A-Za-z0-9-]+")) String key,@Valid @RequestBody OrderInput input) {
        var result=service.create(p,reservationId,stayId,key,input);return ResponseEntity.status(result.replay()?200:201).cacheControl(CacheControl.noStore().cachePrivate()).body(result.order());
    }
    @PutMapping("/transfer-requests/{requestId}")
    @Operation(summary="Editar mi pedido Traslados",description="Persisted transfer; property scope, active authentication, schedule30min, OPEN edit/cancel before25min. No charges or transport provider confirmation.")
    @ApiResponse(responseCode="200",description="Persisted result or idempotent replay",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(schema=@Schema(implementation=Order.class)))
    @ApiResponse(responseCode="409",description="State, version, stay, cutoff or idempotency conflict",content=@Content)
    public ResponseEntity<Order> edit(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId,@PathVariable UUID requestId,@Valid @RequestBody EditInput input) { return ok(service.edit(p,reservationId,stayId,requestId,input)); }
    @PostMapping("/transfer-requests/{requestId}/cancel")
    @Operation(summary="Cancelar mi pedido Traslados",description="Persisted transfer; property scope, active authentication, schedule30min, OPEN edit/cancel before25min. No charges or transport provider confirmation.")
    @ApiResponse(responseCode="200",description="Persisted result or idempotent replay",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(schema=@Schema(implementation=Order.class)))
    @ApiResponse(responseCode="409",description="State, version, stay, cutoff or idempotency conflict",content=@Content)
    public ResponseEntity<Order> cancel(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId,@PathVariable UUID requestId,@Valid @RequestBody Version input) { return ok(service.cancel(p,reservationId,stayId,requestId,input.expectedUpdatedAt())); }
    private static <T> ResponseEntity<T> ok(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(body); }
}
