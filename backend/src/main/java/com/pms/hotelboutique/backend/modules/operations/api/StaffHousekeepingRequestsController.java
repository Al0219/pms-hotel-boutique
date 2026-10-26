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
