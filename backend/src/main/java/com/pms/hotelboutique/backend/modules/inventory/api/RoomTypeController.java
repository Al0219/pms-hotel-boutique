package com.pms.hotelboutique.backend.modules.inventory.api;

import com.pms.hotelboutique.backend.modules.inventory.application.RoomTypeService;
import com.pms.hotelboutique.backend.modules.inventory.application.RoomTypeView;
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
@RequestMapping(value = "/api/v1/properties/{propertyId}/room-types", produces = "application/json")
@Tag(name = "Room types", description = "Staff catalog with explicit C2 property scope; no physical inventory")
@SecurityRequirement(name = "bearerAuth")
@ApiResponse(responseCode = "400", description = "Invalid body/IDs", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(responseCode = "401", description = "Invalid/revoked/non-Staff session", content = @Content)
@ApiResponse(responseCode = "403", description = "Permission or property denied", content = @Content)
@ApiResponse(responseCode = "404", description = "Resource missing in the requested authorized property", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
public class RoomTypeController {
    private final RoomTypeService types;
    public RoomTypeController(RoomTypeService types) { this.types = types; }

    @PostMapping
    @Operation(summary = "Create a room type", description = "COMMERCIAL_MANAGE and C2 PROPERTY scope. Does not create Rooms or sellable capacity.")
    @ApiResponse(responseCode = "201", description = "Created; Location identifies the resource", content = @Content(mediaType = "application/json", schema = @Schema(implementation = RoomTypeView.class)))
    @ApiResponse(responseCode = "409", description = "Code already exists in this property", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<RoomTypeView> create(@PathVariable UUID propertyId, @Valid @RequestBody CreateRoomTypeRequest request) {
        var result = types.create(propertyId, request.code(), request.name());
        return ResponseEntity.created(URI.create("/api/v1/properties/" + propertyId + "/room-types/" + result.id())).body(result);
    }

    @GetMapping
    @Operation(summary = "List room types", description = "Active Staff and C2 PROPERTY scope.")
    @ApiResponse(responseCode = "200", description = "Authorized catalog", content = @Content(mediaType = "application/json", array = @ArraySchema(schema = @Schema(implementation = RoomTypeView.class))))
    public List<RoomTypeView> list(@PathVariable UUID propertyId) { return types.list(propertyId); }

    @GetMapping("/{roomTypeId}")
    @Operation(summary = "Read a room type", description = "The type must belong to the property in the path.")
    @ApiResponse(responseCode = "200", description = "Room type", content = @Content(mediaType = "application/json", schema = @Schema(implementation = RoomTypeView.class)))
    public RoomTypeView get(@PathVariable UUID propertyId, @PathVariable UUID roomTypeId) { return types.get(propertyId, roomTypeId); }

    @PatchMapping("/{roomTypeId}")
    @Operation(summary = "Edit room type code/name", description = "COMMERCIAL_MANAGE; audited row-locked edit. No-op preserves timestamps/audit. IDs and physical capacity remain unchanged.")
    @ApiResponse(responseCode = "200", description = "Updated or unchanged type", content = @Content(mediaType = "application/json", schema = @Schema(implementation = RoomTypeView.class)))
    @ApiResponse(responseCode = "409", description = "Code already exists in this property", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public RoomTypeView update(@PathVariable UUID propertyId, @PathVariable UUID roomTypeId, @Valid @RequestBody PatchRoomTypeRequest request) {
        return types.update(propertyId, roomTypeId, request.getCode(), request.getName());
    }
}
