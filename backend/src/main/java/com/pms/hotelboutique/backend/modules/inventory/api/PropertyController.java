package com.pms.hotelboutique.backend.modules.inventory.api;

import com.pms.hotelboutique.backend.modules.inventory.application.PropertyService;
import com.pms.hotelboutique.backend.modules.inventory.application.PropertyView;
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
import org.springframework.http.ResponseEntity;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(value = "/api/v1/properties", produces = "application/json")
@Tag(name = "Properties", description = "Organization-scoped Staff property administration")
@SecurityRequirement(name = "bearerAuth")
@ApiResponse(responseCode = "400", description = "Invalid body or property ID; unapproved fields are rejected",
        content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(responseCode = "401", description = "Missing, invalid, revoked or non-Staff authentication", content = @Content)
@ApiResponse(responseCode = "403", description = "Insufficient permission or unauthorized property", content = @Content)
public class PropertyController {
    private final PropertyService properties;

    public PropertyController(PropertyService properties) { this.properties = properties; }

    @PostMapping
    @Operation(summary = "Create an active property", description = "SUPER_ADMIN with STAFF_MANAGE. Organization "
            + "comes from the active membership. Timezone and currency are fixed at creation; audited transaction.")
    @ApiResponse(responseCode = "201", description = "Property created; Location identifies the resource",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = PropertyView.class)))
    @ApiResponse(responseCode = "409", description = "Code already exists in the current organization",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<PropertyView> create(@Valid @RequestBody CreatePropertyRequest request) {
        var property = properties.create(request.code(), request.name(), request.timezone(), request.currency());
        return ResponseEntity.created(URI.create("/api/v1/properties/" + property.id())).body(property);
    }

    @GetMapping
    @Operation(summary = "List authorized active properties", description = "Requires MULTI_PROPERTY_READ. "
            + "ALL_PROPERTIES means only the active session's authorized property IDs, applied in SQL.")
    @ApiResponse(responseCode = "200", description = "Authorized active properties",
            content = @Content(mediaType = "application/json", array = @ArraySchema(schema = @Schema(implementation = PropertyView.class))))
    public List<PropertyView> list() { return properties.list(); }

    @GetMapping("/{propertyId}")
    @Operation(summary = "Read an authorized property", description = "Active Staff session and C2 PROPERTY scope required.")
    @ApiResponse(responseCode = "200", description = "Authorized property",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = PropertyView.class)))
    @ApiResponse(responseCode = "404", description = "Property does not exist inside the authorized scope",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public PropertyView get(@PathVariable UUID propertyId) { return properties.get(propertyId); }

    @PatchMapping("/{propertyId}")
    @Operation(summary = "Edit property name and/or code", description = "COMMERCIAL_MANAGE and C2 PROPERTY scope. "
            + "Row lock and append-only before/after audit in one transaction. A repeated no-op changes neither timestamps nor audit.")
    @ApiResponse(responseCode = "200", description = "Updated property, or unchanged property for a no-op",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = PropertyView.class)))
    @ApiResponse(responseCode = "404", description = "Property does not exist inside the authorized scope",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Code already exists in the current organization",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public PropertyView update(@PathVariable UUID propertyId, @Valid @RequestBody PatchPropertyRequest request) {
        return properties.update(propertyId, request.getCode(), request.getName());
    }
}
