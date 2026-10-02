package com.pms.hotelboutique.backend.modules.inventory.api;

import com.pms.hotelboutique.backend.modules.inventory.application.RoomService;
import com.pms.hotelboutique.backend.modules.inventory.application.RoomView;
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
@RequestMapping(value = "/api/v1/properties/{propertyId}/rooms", produces = "application/json")
@Tag(name = "Rooms", description = "Staff catalog with explicit C2 property scope; physical inventory distinct from ATS")
@SecurityRequirement(name = "bearerAuth")
@ApiResponse(responseCode = "400", description = "Invalid body/IDs", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(responseCode = "401", description = "Invalid/revoked/non-Staff session", content = @Content)
@ApiResponse(responseCode = "403", description = "Permission or property denied", content = @Content)
@ApiResponse(responseCode = "404", description = "Resource missing in the requested authorized property", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
public class RoomController {
    private final RoomService rooms;
    public RoomController(RoomService rooms) { this.rooms = rooms; }

    @PostMapping
    @Operation(summary = "Create a room", description = "COMMERCIAL_MANAGE and C2 PROPERTY scope. Creates one physical Room; RoomType must belong to this property.")
    @ApiResponse(responseCode = "201", description = "Created; Location identifies the resource", content = @Content(mediaType = "application/json", schema = @Schema(implementation = RoomView.class)))
    @ApiResponse(responseCode = "409", description = "Code already exists in this property", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<RoomView> create(@PathVariable UUID propertyId, @Valid @RequestBody CreateRoomRequest request) {
        var result = rooms.create(propertyId, request.roomTypeId(), request.code());
        return ResponseEntity.created(URI.create("/api/v1/properties/" + propertyId + "/rooms/" + result.id())).body(result);
    }

    @GetMapping
    @Operation(summary = "List rooms", description = "Active Staff and C2 PROPERTY scope.")
    @ApiResponse(responseCode = "200", description = "Authorized catalog", content = @Content(mediaType = "application/json", array = @ArraySchema(schema = @Schema(implementation = RoomView.class))))
    public List<RoomView> list(@PathVariable UUID propertyId) { return rooms.list(propertyId); }

    @GetMapping("/{roomId}")
    @Operation(summary = "Read a room", description = "The room must belong to the property in the path.")
    @ApiResponse(responseCode = "200", description = "Room", content = @Content(mediaType = "application/json", schema = @Schema(implementation = RoomView.class)))
    public RoomView get(@PathVariable UUID propertyId, @PathVariable UUID roomId) { return rooms.get(propertyId, roomId); }

    @PatchMapping("/{roomId}")
    @Operation(summary = "Edit room code", description = "COMMERCIAL_MANAGE; audited row-locked edit. No-op preserves timestamps/audit. IDs and physical capacity remain unchanged.")
    @ApiResponse(responseCode = "200", description = "Updated or unchanged room", content = @Content(mediaType = "application/json", schema = @Schema(implementation = RoomView.class)))
    @ApiResponse(responseCode = "409", description = "Code already exists in this property", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public RoomView update(@PathVariable UUID propertyId, @PathVariable UUID roomId, @Valid @RequestBody PatchRoomRequest request) {
        return rooms.update(propertyId, roomId, request.code());
    }
}
