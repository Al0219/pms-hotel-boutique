package com.pms.hotelboutique.backend.modules.guestauth.api;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.operations.application.RoomServiceRequestService;
import com.pms.hotelboutique.backend.modules.operations.application.RoomServiceModels.*;
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
@Tag(name="Guest room service")
@SecurityRequirement(name="guestBearerAuth")
@ApiResponse(responseCode="400",description="Invalid body, quantities, products, meal window, date or notes",content=@Content)
@ApiResponse(responseCode="401",description="Active Guest required; Staff rejected",content=@Content)
@ApiResponse(responseCode="404",description="Linked stay/order unavailable; foreign resources indistinguishable",content=@Content)
public class GuestRoomServiceController {
    private final RoomServiceRequestService service;
    public GuestRoomServiceController(RoomServiceRequestService service) { this.service=service; }
    @GetMapping("/room-service-menu")
    @Operation(summary="Catálogo Room Service de mi estancia",description="GuestPrincipal y vínculo propios revalidados; precios/disponibilidad GTQ de PostgreSQL de la propiedad. No catálogo mock ni precio del cliente.")
    @ApiResponse(responseCode="200",description="Own property catalog",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(array=@ArraySchema(schema=@Schema(implementation=Product.class))))
    public ResponseEntity<List<Product>> catalog(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId) { return ok(service.catalog(p,reservationId,stayId)); }
    @GetMapping("/room-service-orders")
    @Operation(summary="Mis pedidos Room Service",description="Solo pedidos propios de la estancia vinculada, todos los estados y líneas con precios snapshot. Identidad únicamente de sesión Guest, sin accountId del cliente.")
    @ApiResponse(responseCode="200",description="Own persisted orders",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(array=@ArraySchema(schema=@Schema(implementation=Order.class))))
    public ResponseEntity<List<Order>> list(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId) { return ok(service.list(p,reservationId,stayId)); }
    @PostMapping("/room-service-orders")
    @Operation(summary="Crear pedido Room Service",description="Idempotency-Key16–100; mismo payload normalizado recupera ID actual sin duplicar incluso si cambió catálogo/estado. Precios y totales servidor en GTQ, snapshot persistido; sin pago/cargo folio. Reserva CONFIRMED y estancia RESERVED/IN_HOUSE; propiedad/timezone y habitación derivadas del servidor. Horario comida, fecha estancia,30min y checkout normal12:00. No late checkout simulado.")
    @ApiResponse(responseCode="201",description="Created OPEN",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(schema=@Schema(implementation=Order.class)))
    @ApiResponse(responseCode="200",description="Idempotent replay",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(schema=@Schema(implementation=Order.class)))
    @ApiResponse(responseCode="409",description="Key conflict or stay ineligible",content=@Content)
    public ResponseEntity<Order> create(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId,
            @RequestHeader("Idempotency-Key") @Parameter(required=true,schema=@Schema(minLength=16,maxLength=100,pattern="[A-Za-z0-9-]+")) String key,@Valid @RequestBody OrderInput input) {
        var result=service.create(p,reservationId,stayId,key,input);return ResponseEntity.status(result.replay()?200:201).cacheControl(CacheControl.noStore().cachePrivate()).body(result.order());
    }
    @PutMapping("/room-service-orders/{requestId}")
    @Operation(summary="Editar mi pedido Room Service",description="Solo OPEN propio antes de25min contra due_at persistido; lock/CAS expectedUpdatedAt, mismo ID. Reprogramación nueva requiere30min. Cantidades1–5, productos propios/disponibles, notas trim/max500. Precios snapshot existentes conservados, productos nuevos precio vigente. No-op exacto no reaudita.")
    @ApiResponse(responseCode="200",description="Updated order or no-op",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(schema=@Schema(implementation=Order.class)))
    @ApiResponse(responseCode="409",description="Version, state, cutoff or stay conflict",content=@Content)
    public ResponseEntity<Order> edit(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId,@PathVariable UUID requestId,@Valid @RequestBody EditInput input) { return ok(service.edit(p,reservationId,stayId,requestId,input)); }
    @PostMapping("/room-service-orders/{requestId}/cancel")
    @Operation(summary="Cancelar mi pedido Room Service",description="Guest propio OPEN y cutoff25min de servidor; transición CANCELLED, sin borrar pedido. Lock/CAS expectedUpdatedAt; replay CANCELLED sin nueva transición/auditoría. No Guest DONE ni acciones Staff.")
    @ApiResponse(responseCode="200",description="Cancellation or replay",headers=@Header(name="Cache-Control",description="private, no-store"),content=@Content(schema=@Schema(implementation=Order.class)))
    @ApiResponse(responseCode="409",description="Version, state, cutoff or stay conflict",content=@Content)
    public ResponseEntity<Order> cancel(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p,@PathVariable UUID reservationId,@PathVariable UUID stayId,@PathVariable UUID requestId,@Valid @RequestBody Version input) { return ok(service.cancel(p,reservationId,stayId,requestId,input.expectedUpdatedAt())); }
    private static <T> ResponseEntity<T> ok(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(body); }
}
