package com.pms.hotelboutique.backend.modules.inventory.api;

import com.pms.hotelboutique.backend.modules.inventory.application.RatePlanService;
import com.pms.hotelboutique.backend.modules.inventory.application.RatePlanView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(value = "/api/v1/properties/{propertyId}/rate-plans", produces = "application/json")
@Tag(name = "Rate plans", description = "Staff catalog with explicit C2 property scope; no physical inventory")
@SecurityRequirement(name = "bearerAuth")
@ApiResponse(responseCode = "400", description = "Invalid body/IDs", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(responseCode = "401", description = "Invalid/revoked/non-Staff session", content = @Content)
@ApiResponse(responseCode = "403", description = "Permission or property denied", content = @Content)
@ApiResponse(responseCode = "404", description = "Resource missing in the requested authorized property", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
public class RatePlanController {
    private final RatePlanService plans;
    public RatePlanController(RatePlanService plans) { this.plans = plans; }

    @PostMapping
    @Operation(summary = "Create a rate plan", description = "COMMERCIAL_MANAGE and C2 PROPERTY scope. Exact decimal string and ISO currency; RoomType must belong to this property. Does not change physical inventory.")
    @ApiResponse(responseCode = "201", description = "Created; Location identifies the resource", content = @Content(mediaType = "application/json", schema = @Schema(implementation = RatePlanView.class)))
    @ApiResponse(responseCode = "409", description = "Code already exists for this room type in the property", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<RatePlanView> create(@PathVariable UUID propertyId, @Valid @RequestBody CreateRatePlanRequest request) {
        var result = plans.create(propertyId, request.roomTypeId(), request.code(), request.name(), request.basePrice().toAmount());
        return ResponseEntity.created(URI.create("/api/v1/properties/" + propertyId + "/rate-plans/" + result.id())).body(result);
    }

    @GetMapping
    @Operation(summary = "List rate plans", description = "Active Staff and C2 PROPERTY scope.")
    @ApiResponse(responseCode = "200", description = "Authorized catalog", content = @Content(mediaType = "application/json", array = @ArraySchema(schema = @Schema(implementation = RatePlanView.class))))
    public List<RatePlanView> list(@PathVariable UUID propertyId) { return plans.list(propertyId); }

    @GetMapping("/{ratePlanId}")
    @Operation(summary = "Read a rate plan", description = "The plan must belong to the property in the path.")
    @ApiResponse(responseCode = "200", description = "Rate plan", content = @Content(mediaType = "application/json", schema = @Schema(implementation = RatePlanView.class)))
    public RatePlanView get(@PathVariable UUID propertyId, @PathVariable UUID ratePlanId) { return plans.get(propertyId, ratePlanId); }

    @PatchMapping("/{ratePlanId}")
    @Operation(summary = "Edit rate plan code/name/price", description = "COMMERCIAL_MANAGE; audited row-locked edit. No-op preserves timestamps/audit. IDs and physical capacity remain unchanged.")
    @ApiResponse(responseCode = "200", description = "Updated or unchanged plan", content = @Content(mediaType = "application/json", schema = @Schema(implementation = RatePlanView.class)))
    @ApiResponse(responseCode = "409", description = "Code already exists for this room type in the property", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public RatePlanView update(@PathVariable UUID propertyId, @PathVariable UUID ratePlanId, @Valid @RequestBody PatchRatePlanRequest request) {
        return plans.update(propertyId, ratePlanId, request.getCode(), request.getName(), request.getBasePrice() == null ? null : request.getBasePrice().toAmount());
    }
}
