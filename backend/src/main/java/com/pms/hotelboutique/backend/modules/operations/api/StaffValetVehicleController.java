package com.pms.hotelboutique.backend.modules.operations.api;
import com.pms.hotelboutique.backend.modules.operations.application.ValetRequestService;
import com.pms.hotelboutique.backend.modules.operations.application.ValetModels.*;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping(value="/api/v1/properties/{propertyId}/valet-vehicles",produces="application/json")
@Tag(name="Staff valet")
@SecurityRequirement(name="bearerAuth")
@ApiResponse(responseCode="400",description="Invalid UUID/body",content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=ProblemDetail.class)))
@ApiResponse(responseCode="401",description="Active Staff required; Guest rejected",content=@Content)
@ApiResponse(responseCode="403",description="Permission or authorized property denied",content=@Content)
public class StaffValetVehicleController {
 private final ValetRequestService service;
 public StaffValetVehicleController(ValetRequestService service){this.service=service;}
 @GetMapping
 @Operation(summary="Vehículos de la propiedad",description="SERVICE_REQUEST_INTAKE u OPERATIONS_MANAGE, scope explícito y sesión Staff revalidada. No expone GuestAccountId ni claves de idempotencia.")
 @ApiResponse(responseCode="200",description="Scoped vehicles",content=@Content(array=@ArraySchema(schema=@Schema(implementation=Vehicle.class))))
 public ResponseEntity<List<Vehicle>> list(@Parameter(hidden=true) @AuthenticationPrincipal StaffPrincipal p,@PathVariable UUID propertyId){return ok(service.staffVehicles(p,propertyId));}
 @PostMapping("/{vehicleId}/return")
 @Operation(summary="Confirmar retorno al parqueo",description="Solo OPERATIONS_MANAGE, misma propiedad. Confirmación Staff WITH_GUEST→PARKED con CAS/lock, auditoría e idempotencia sin reabrir solicitudes ni alterar snapshots.")
 @ApiResponse(responseCode="200",description="Returned vehicle/replay",content=@Content(schema=@Schema(implementation=Vehicle.class)))
 @ApiResponse(responseCode="404",description="Vehicle outside property or absent",content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=ProblemDetail.class)))
 @ApiResponse(responseCode="409",description="Stale version or custody conflict",content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=ProblemDetail.class)))
 public ResponseEntity<Vehicle> returned(@Parameter(hidden=true) @AuthenticationPrincipal StaffPrincipal p,@PathVariable UUID propertyId,@PathVariable UUID vehicleId,@Valid @RequestBody Version input){return ok(service.staffReturn(p,propertyId,vehicleId,input.expectedUpdatedAt()));}
 @PostMapping("/{vehicleId}/release")
 @Operation(summary="Confirmar entrega excepcional de custodia pendiente",description="Solo OPERATIONS_MANAGE y propiedad autorizada. Estancia CHECKED_OUT/CANCELLED/NO_SHOW, vehículo PARKED, ninguna petición activa. CAS expectedUpdatedAt, lock por vehículo guardado y asociación, PARKED→WITH_GUEST y cierre de custodia atómicos con auditoría actor/vehículo/propiedad/estancia/hora. Replay por versión del evento, sin duplicar auditoría. No crea ni modifica solicitudes y no existe endpoint Guest.")
 @ApiResponse(responseCode="200",description="Custody delivered/replay",content=@Content(schema=@Schema(implementation=Vehicle.class)))
 @ApiResponse(responseCode="404",description="Vehicle outside property or absent",content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=ProblemDetail.class)))
 @ApiResponse(responseCode="409",description="Stale version, active request or not an ended parked stay",content=@Content(mediaType="application/problem+json",schema=@Schema(implementation=ProblemDetail.class)))
 public ResponseEntity<Vehicle> release(@Parameter(hidden=true) @AuthenticationPrincipal StaffPrincipal p,@PathVariable UUID propertyId,@PathVariable UUID vehicleId,@Valid @RequestBody Version input){return ok(service.exceptionalDelivery(p,propertyId,vehicleId,input.expectedUpdatedAt()));}
 private static <T> ResponseEntity<T> ok(T body){return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(body);}
}
