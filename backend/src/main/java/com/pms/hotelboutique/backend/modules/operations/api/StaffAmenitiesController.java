package com.pms.hotelboutique.backend.modules.operations.api;
import com.pms.hotelboutique.backend.modules.operations.application.AmenitiesRequestService;
import com.pms.hotelboutique.backend.modules.operations.application.AmenitiesModels.*;
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
@RequestMapping(value="/api/v1/properties/{propertyId}/service-requests/amenities",produces="application/json")
@Tag(name="Staff amenities")
@SecurityRequirement(name="bearerAuth")
@ApiResponse(responseCode="400",description="Invalid UUID/body/target status",content=@Content)
@ApiResponse(responseCode="401",description="Active Staff required; Guest rejected",content=@Content)
@ApiResponse(responseCode="403",description="Permission or authorized property denied",content=@Content)
public class StaffAmenitiesController {
    private final AmenitiesRequestService service;
    public StaffAmenitiesController(AmenitiesRequestService service) { this.service=service; }
    @GetMapping
    @Operation(summary="Consultar pedidos Amenidades",description="Staff activo, SERVICE_REQUEST_INTAKE u OPERATIONS_MANAGE y scope de propiedad. Referencia/habitación, artículos/nombres snapshot/cantidades y estados persistidos; sin PII de cuenta.")
    @ApiResponse(responseCode="200",description="Authorized property orders",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(array=@ArraySchema(schema=@Schema(implementation=Order.class))))
    public ResponseEntity<List<Order>> list(@Parameter(hidden=true) @AuthenticationPrincipal StaffPrincipal p,@PathVariable UUID propertyId) { return ok(service.staffList(p,propertyId)); }
    @PutMapping("/{requestId}/status")
    @Operation(summary="Gestionar pedido Amenidades",description="OPERATIONS_MANAGE obligatorio y propiedad autorizada. Solo OPEN→IN_PROGRESS→DONE, CAS updatedAt/lock y auditoría actor Staff. Repetir estado actual no reaudita. INTAKE solo lectura. No modifica habitación, pagos ni folio.")
    @ApiResponse(responseCode="200",description="Persisted transition/replay",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(schema=@Schema(implementation=Order.class)))
    @ApiResponse(responseCode="404",description="Order not in authorized property",content=@Content)
    @ApiResponse(responseCode="409",description="Invalid transition or stale version",content=@Content)
    public ResponseEntity<Order> transition(@Parameter(hidden=true) @AuthenticationPrincipal StaffPrincipal p,@PathVariable UUID propertyId,@PathVariable UUID requestId,@Valid @RequestBody Transition input) { return ok(service.staffTransition(p,propertyId,requestId,input)); }
    private static <T> ResponseEntity<T> ok(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(body); }
}
