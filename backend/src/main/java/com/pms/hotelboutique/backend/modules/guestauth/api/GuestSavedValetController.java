package com.pms.hotelboutique.backend.modules.guestauth.api;
import com.pms.hotelboutique.backend.modules.guestauth.application.GuestPrincipal;
import com.pms.hotelboutique.backend.modules.operations.application.ValetRequestService;
import com.pms.hotelboutique.backend.modules.operations.application.ValetModels.SavedVehicle;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping(value="/api/v1/guest-auth/account/valet-vehicles",produces="application/json")
@Tag(name="Guest valet")
@SecurityRequirement(name="guestBearerAuth")
public class GuestSavedValetController {
 private final ValetRequestService service;
 public GuestSavedValetController(ValetRequestService service){this.service=service;}
 @GetMapping
 @Operation(summary="Mis vehículos guardados entre estancias",description="Solo Guest activo; identidad de sesión revalidada. No admite guestAccountId de cliente, no incluye ubicación/propiedad/estancia ni solicitudes ajenas. canAssociate procede de asociaciones operativas persistidas; no es una reserva de custodia.")
 @ApiResponse(responseCode="200",description="Own account vehicles",content=@Content(array=@ArraySchema(schema=@Schema(implementation=SavedVehicle.class))))
 @ApiResponse(responseCode="401",description="Active Guest required; Staff rejected",content=@Content)
 public ResponseEntity<List<SavedVehicle>> list(@Parameter(hidden=true) @AuthenticationPrincipal GuestPrincipal p){return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(service.savedVehicles(p));}
}
