package com.pms.hotelboutique.backend.modules.operations.api;
import com.pms.hotelboutique.backend.modules.operations.application.TransferRequestService;
import com.pms.hotelboutique.backend.modules.operations.application.TransferModels.*;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
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
@RequestMapping(value="/api/v1/properties/{propertyId}/service-requests/transfers",produces="application/json")
@Tag(name="Staff transfers")
@SecurityRequirement(name="bearerAuth")
@ApiResponse(responseCode="400",description="Invalid body, route, passengers or schedule",content=@Content)
@ApiResponse(responseCode="401",description="Active authentication required",content=@Content)
@ApiResponse(responseCode="403",description="Permission or property scope denied",content=@Content)
public class StaffTransferController {
    private final TransferRequestService service;
    public StaffTransferController(TransferRequestService service) { this.service=service; }
    @GetMapping
    @Operation(summary="Consultar pedidos Traslados",description="Persisted transfer; property scope, active authentication, schedule30min, OPEN edit/cancel before25min. No charges or transport provider confirmation.")
    @ApiResponse(responseCode="200",description="Persisted result or idempotent replay",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(array=@ArraySchema(schema=@Schema(implementation=Order.class))))
    public ResponseEntity<List<Order>> list(@Parameter(hidden=true) @AuthenticationPrincipal StaffPrincipal p,@PathVariable UUID propertyId) { return ok(service.staffList(p,propertyId)); }
    @PutMapping("/{requestId}/status")
    @Operation(summary="Gestionar pedido Traslados",description="Persisted transfer; property scope, active authentication, schedule30min, OPEN edit/cancel before25min. No charges or transport provider confirmation.")
    @ApiResponse(responseCode="200",description="Persisted result or idempotent replay",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(schema=@Schema(implementation=Order.class)))
    @ApiResponse(responseCode="404",description="Transfer or linked stay unavailable",content=@Content)
    @ApiResponse(responseCode="409",description="State, version, stay, cutoff or idempotency conflict",content=@Content)
    public ResponseEntity<Order> transition(@Parameter(hidden=true) @AuthenticationPrincipal StaffPrincipal p,@PathVariable UUID propertyId,@PathVariable UUID requestId,@Valid @RequestBody Transition input) { return ok(service.staffTransition(p,propertyId,requestId,input)); }
    private static <T> ResponseEntity<T> ok(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(body); }
}
