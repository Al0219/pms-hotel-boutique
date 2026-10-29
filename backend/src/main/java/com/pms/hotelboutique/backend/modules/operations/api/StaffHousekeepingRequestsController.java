package com.pms.hotelboutique.backend.modules.operations.api;

import com.pms.hotelboutique.backend.modules.operations.application.StaffServiceRequestService;
import com.pms.hotelboutique.backend.modules.operations.application.StaffServiceRequestService.HousekeepingRequestView;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.*;
import java.time.Instant;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(value = "/api/v1/properties/{propertyId}/service-requests/housekeeping", produces = "application/json")
@Tag(name = "Staff service requests")
@SecurityRequirement(name = "bearerAuth")
public class StaffHousekeepingRequestsController {
    private final StaffServiceRequestService service;
    public StaffHousekeepingRequestsController(StaffServiceRequestService service) { this.service = service; }
    @Schema(name = "StaffHousekeepingTransition", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
    public record TransitionRequest(@NotNull Instant expectedUpdatedAt,
            @NotNull @jakarta.validation.constraints.Pattern(regexp = "IN_PROGRESS|DONE") @Schema(allowableValues = {"IN_PROGRESS", "DONE"}) String targetStatus) {
        @JsonAnySetter public void rejectUnknown(String key, Object value) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown request field"); }
    }
    @PutMapping("/{requestId}/status")
    @Operation(summary = "Gestionar solicitud de limpieza", description = "OPERATIONS_MANAGE obligatorio y propiedad autorizada. OPEN→IN_PROGRESS→DONE, CAS updatedAt y lock; replay del mismo estado no reaudita. SERVICE_REQUEST_INTAKE solo lectura. No altera DIRTY/CLEAN/INSPECTED.")
    @ApiResponse(responseCode = "200", description = "Persisted transition or replay", headers = @Header(name = "Cache-Control", description = "private, no-store"), content = @Content(schema = @Schema(implementation = StaffServiceRequestService.TransitionResult.class)))
    @ApiResponse(responseCode = "400", description = "Invalid body or target status", content = @Content)
    @ApiResponse(responseCode = "401", description = "Staff required", content = @Content)
    @ApiResponse(responseCode = "403", description = "OPERATIONS_MANAGE or property denied", content = @Content)
    @ApiResponse(responseCode = "404", description = "Request not in authorized property", content = @Content)
    @ApiResponse(responseCode = "409", description = "State or timestamp changed", content = @Content)
    public ResponseEntity<StaffServiceRequestService.TransitionResult> transition(@Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal,
            @PathVariable UUID propertyId, @PathVariable UUID requestId, @Valid @RequestBody TransitionRequest body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate())
            .body(service.transitionHousekeeping(principal, propertyId, requestId, body.expectedUpdatedAt(), ServiceRequest.Status.valueOf(body.targetStatus())));
    }

    @GetMapping
    @Operation(summary = "Consultar solicitudes Guest de limpieza", description = "Solo lectura. Sesión Staff vigente, permiso SERVICE_REQUEST_INTAKE u OPERATIONS_MANAGE y propiedad autorizada, según StaffServiceRequestService existente. No cambia estados físicos ni agrega transiciones Guest.")
    @ApiResponse(responseCode = "200", description = "Persisted housekeeping requests in authorized property", headers = @Header(name = "Cache-Control", description = "private, no-store"), content = @Content(array = @ArraySchema(schema = @Schema(implementation = HousekeepingRequestView.class))))
    @ApiResponse(responseCode = "400", description = "Invalid property UUID", content = @Content)
    @ApiResponse(responseCode = "401", description = "Staff session required; Guest rejected", content = @Content)
    @ApiResponse(responseCode = "403", description = "Permission or property scope denied", content = @Content)
    public ResponseEntity<List<HousekeepingRequestView>> list(@Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal,
            @PathVariable UUID propertyId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(service.listHousekeeping(principal, propertyId));
    }
}
