package com.pms.hotelboutique.backend.modules.guestauth.api;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.operations.application.ValetRequestService;
import com.pms.hotelboutique.backend.modules.operations.application.ValetModels.*;
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
@Tag(name="Guest valet")
@SecurityRequirement(name="guestBearerAuth")
@ApiResponse(responseCode="400",description="Invalid body, plate or schedule",content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=ProblemDetail.class)))
@ApiResponse(responseCode="401",description="Active Guest required; Staff rejected",content=@Content)
@ApiResponse(responseCode="404",description="Linked stay/order unavailable; foreign resources indistinguishable",content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=ProblemDetail.class)))
public class GuestValetController {
    private final ValetRequestService service;
    public GuestValetController(ValetRequestService service) { this.service=service; }
    @GetMapping("/valet-vehicles")
    @Operation(summary="Mis vehículos persistidos",description="Guest activo, vínculo propio, misma estancia y propiedad; historial de ubicación sin PII de cuenta.")
    @ApiResponse(responseCode="200",description="Own vehicles",content=@Content(array=@ArraySchema(schema=@Schema(implementation=Vehicle.class))))
    public ResponseEntity<List<Vehicle>> vehicles(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId){return ok(service.vehicles(p,reservationId,stayId));}
    @PostMapping("/valet-vehicles")
    @Operation(summary="Registrar vehículo",description="Crea identidad guardada persistente por cuenta y asociación propia, ambas atómicas. Idempotency-Key16–100; placa/prefijo normalizados únicos por cuenta Guest, marca/modelo40 y color30. Ubicación inicial declarada; no prueba de custodia ni consulta SAT. Identidad/property derivadas de sesión/vínculo.")
    @ApiResponse(responseCode="201",description="Vehicle registered",content=@Content(schema=@Schema(implementation=Vehicle.class)))
    @ApiResponse(responseCode="200",description="Registration replay",content=@Content(schema=@Schema(implementation=Vehicle.class)))
    @ApiResponse(responseCode="409",description="Duplicate plate, key or stay conflict",content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=ProblemDetail.class)))
    public ResponseEntity<Vehicle> register(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId,@RequestHeader("Idempotency-Key") @Parameter(required=true,schema=@Schema(minLength=16,maxLength=100,pattern="[A-Za-z0-9-]+")) String key,@Valid @RequestBody VehicleInput input){var result=service.register(p,reservationId,stayId,key,input);return ResponseEntity.status(result.replay()?200:201).cacheControl(CacheControl.noStore().cachePrivate()).body(result.vehicle());}
    @PostMapping("/valet-vehicles/associate")
    @Operation(summary="Asociar mi vehículo guardado a esta estancia",description="Guest activo y estancia propia elegible. Idempotency-Key16–100; savedVehicleId propio, expectedVehicleUpdatedAt y ubicación inicial explícita. Bloquea cualquier asociación operativa, PARKED o petición activa anterior. Sin heredar ubicación/peticiones. Máximo una asociación operativa por identidad guardada en PostgreSQL.")
    @ApiResponse(responseCode="201",description="New stay association",content=@Content(schema=@Schema(implementation=Vehicle.class)))
    @ApiResponse(responseCode="200",description="Idempotent association replay",content=@Content(schema=@Schema(implementation=Vehicle.class)))
    @ApiResponse(responseCode="409",description="Incompatible association, stale saved version, key or stay conflict",content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=ProblemDetail.class)))
    public ResponseEntity<Vehicle> associate(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId,@RequestHeader("Idempotency-Key") @Parameter(required=true,schema=@Schema(minLength=16,maxLength=100,pattern="[A-Za-z0-9-]+")) String key,@Valid @RequestBody AssociationInput input){var result=service.associate(p,reservationId,stayId,key,input);return ResponseEntity.status(result.replay()?200:201).cacheControl(CacheControl.noStore().cachePrivate()).body(result.vehicle());}
    @PutMapping("/valet-vehicles/{vehicleId}")
    @Operation(summary="Editar mi vehículo",description="CAS expectedUpdatedAt, sin OPEN/IN_PROGRESS. Solo datos, no cambia custodia; snapshots existentes inmutables. Idéntico payload es no-op.")
    @ApiResponse(responseCode="200",description="Vehicle updated",content=@Content(schema=@Schema(implementation=Vehicle.class)))
    @ApiResponse(responseCode="409",description="Active request, plate, version or stay conflict",content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=ProblemDetail.class)))
    public ResponseEntity<Vehicle> editVehicle(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId,@PathVariable UUID vehicleId,@Valid @RequestBody VehicleEdit input){return ok(service.editVehicle(p,reservationId,stayId,vehicleId,input));}
    @GetMapping("/valet-requests")
    @Operation(summary="Mis pedidos Valet",description="Solo solicitudes propias de la estancia vinculada, todos los estados y vehículo snapshot. Identidad únicamente de sesión Guest, sin accountId del cliente.")
    @ApiResponse(responseCode="200",description="Own persisted orders",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(array=@ArraySchema(schema=@Schema(implementation=Order.class))))
    public ResponseEntity<List<Order>> list(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId) { return ok(service.list(p,reservationId,stayId)); }
    @PostMapping("/valet-requests")
    @Operation(summary="Crear pedido Valet",description="Idempotency-Key16–100; mismo payload recupera ID actual. Vehículo PARKED propio sin solicitud activa, unicidad PostgreSQL. Reserva CONFIRMED y estancia RESERVED/IN_HOUSE; fecha estancia,30min y checkout normal12:00 en timezone persistida. Crear no cambia ubicación. Sin cargos ni traslados.")
    @ApiResponse(responseCode="201",description="Created OPEN",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(schema=@Schema(implementation=Order.class)))
    @ApiResponse(responseCode="200",description="Idempotent replay",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(schema=@Schema(implementation=Order.class)))
    @ApiResponse(responseCode="409",description="Key conflict or stay ineligible",content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=ProblemDetail.class)))
    public ResponseEntity<Order> create(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId,
            @RequestHeader("Idempotency-Key") @Parameter(required=true,schema=@Schema(minLength=16,maxLength=100,pattern="[A-Za-z0-9-]+")) String key,@Valid @RequestBody OrderInput input) {
        var result=service.create(p,reservationId,stayId,key,input);return ResponseEntity.status(result.replay()?200:201).cacheControl(CacheControl.noStore().cachePrivate()).body(result.order());
    }
    @PutMapping("/valet-requests/{requestId}")
    @Operation(summary="Editar mi pedido Valet",description="Solo OPEN propio antes de25min contra due_at persistido; lock/CAS expectedUpdatedAt. Reprogramar requiere30min. Conserva vehículo y snapshot histórico, mismo ID. Guest no completa ni modifica ubicación.")
    @ApiResponse(responseCode="200",description="Updated order or no-op",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(schema=@Schema(implementation=Order.class)))
    @ApiResponse(responseCode="409",description="Version, state, cutoff or stay conflict",content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=ProblemDetail.class)))
    public ResponseEntity<Order> edit(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId,@PathVariable UUID requestId,@Valid @RequestBody EditInput input) { return ok(service.edit(p,reservationId,stayId,requestId,input)); }
    @PostMapping("/valet-requests/{requestId}/cancel")
    @Operation(summary="Cancelar mi pedido Valet",description="Guest propio OPEN y cutoff25min de servidor; transición CANCELLED, sin borrar pedido. Lock/CAS expectedUpdatedAt; replay CANCELLED sin nueva transición/auditoría. No Guest DONE ni acciones Staff.")
    @ApiResponse(responseCode="200",description="Cancellation or replay",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(schema=@Schema(implementation=Order.class)))
    @ApiResponse(responseCode="409",description="Version, state, cutoff or stay conflict",content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=ProblemDetail.class)))
    public ResponseEntity<Order> cancel(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId,@PathVariable UUID requestId,@Valid @RequestBody Version input) { return ok(service.cancel(p,reservationId,stayId,requestId,input.expectedUpdatedAt())); }
    private static <T> ResponseEntity<T> ok(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(body); }
}
