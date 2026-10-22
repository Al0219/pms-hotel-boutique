package com.pms.hotelboutique.backend.modules.operations.api;

import com.pms.hotelboutique.backend.modules.operations.application.StaffHousekeepingService;
import com.pms.hotelboutique.backend.modules.operations.application.StaffHousekeepingService.Board;
import com.pms.hotelboutique.backend.modules.operations.application.StaffHousekeepingService.RoomState;
import com.pms.hotelboutique.backend.modules.operations.domain.HkRoomState;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(value = "/api/v1/properties/{propertyId}/housekeeping/rooms", produces = "application/json")
@Tag(name = "Staff housekeeping")
@SecurityRequirement(name = "bearerAuth")
@ApiResponse(responseCode = "400", description = "Invalid UUID, unknown query/body or invalid field", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(responseCode = "401", description = "Active Staff session required; Guest is rejected", content = @Content)
@ApiResponse(responseCode = "403", description = "OPERATIONS_MANAGE or property membership missing", content = @Content)
@ApiResponse(responseCode = "200", description = "Authorized persisted Housekeeping state", headers = @Header(name = "Cache-Control", description = "private, no-store", schema = @Schema(type = "string")))
public class StaffHousekeepingController {
    private final StaffHousekeepingService service;
    public StaffHousekeepingController(StaffHousekeepingService service) { this.service = service; }

    @GetMapping
    @Operation(operationId = "listStaffHousekeeping", summary = "Housekeeping board for one authorized property",
            description = "OPERATIONS_MANAGE and live PROPERTY scope. Unpaginated physical rooms; untracked status/DND/date are null. GET never creates tracking or changes inventory.")
    public Board list(HttpServletRequest request, @PathVariable @Parameter(schema = @Schema(type = "string", format = "uuid")) String propertyId,
            @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        noQuery(request); return service.list(principal, id(propertyId));
    }
    @GetMapping("/{roomId}")
    @Operation(operationId = "getStaffHousekeepingRoom", summary = "Read one physical room and its optional cleaning state")
    @ApiResponse(responseCode = "404", description = "Room absent from the authorized property", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public RoomState detail(HttpServletRequest request, @PathVariable @Parameter(schema = @Schema(type = "string", format = "uuid")) String propertyId, @PathVariable @Parameter(schema = @Schema(type = "string", format = "uuid")) String roomId,
            @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        noQuery(request); return service.detail(principal, id(propertyId), id(roomId));
    }
    @Schema(additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
    public record TrackingRequest() {
        @JsonAnySetter public void rejectUnknown(String key, Object value) { throw new IllegalArgumentException("Unknown field"); }
    }
    @Schema(additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
    public record StatusRequest(@NotNull HkRoomState.Status expectedStatus, @NotNull Instant expectedUpdatedAt,
            @NotNull HkRoomState.Status toStatus, @Size(max = 280) @Schema(types = {"string", "null"}) String reason) {
        @JsonAnySetter public void rejectUnknown(String key, Object value) { throw new IllegalArgumentException("Unknown field"); }
    }
    @Schema(additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
    public record DndRequest(@NotNull Instant expectedUpdatedAt, @NotNull Boolean dnd) {
        @JsonAnySetter public void rejectUnknown(String key, Object value) { throw new IllegalArgumentException("Unknown field"); }
    }
    @PostMapping(value = "/{roomId}/tracking", consumes = "application/json")
    @Operation(operationId = "trackStaffHousekeepingRoom", summary = "Explicitly start DIRTY tracking without resetting existing state",
            description = "OPERATIONS_MANAGE; locks the scoped physical Room. Actor comes from Staff. Idempotent retry returns existing state without duplicate HK_TRACKED audit.")
    @ApiResponse(responseCode = "404", description = "Room absent from the authorized property", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public RoomState track(HttpServletRequest request, @PathVariable @Parameter(schema = @Schema(type = "string", format = "uuid")) String propertyId, @PathVariable @Parameter(schema = @Schema(type = "string", format = "uuid")) String roomId,
            @Valid @RequestBody TrackingRequest body, @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        noQuery(request); return service.track(principal, id(propertyId), id(roomId));
    }
    @PutMapping(value = "/{roomId}/status", consumes = "application/json")
    @Operation(operationId = "changeStaffHousekeepingStatus", summary = "Apply a guarded cleaning transition",
            description = "OPERATIONS_MANAGE; expectedStatus and exact persisted UTC expectedUpdatedAt required. DIRTY to CLEAN to INSPECTED; return to DIRTY requires a reason. Atomic audit; stale/replayed commands return 409 without a second event.")
    @ApiResponse(responseCode = "404", description = "Room absent from the authorized property", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Untracked room, stale version or invalid transition", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public RoomState status(HttpServletRequest request, @PathVariable @Parameter(schema = @Schema(type = "string", format = "uuid")) String propertyId, @PathVariable @Parameter(schema = @Schema(type = "string", format = "uuid")) String roomId,
            @Valid @RequestBody StatusRequest body, @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        noQuery(request); return service.transition(principal, id(propertyId), id(roomId), body.expectedStatus(), body.expectedUpdatedAt(), body.toStatus(), body.reason());
    }
    @PutMapping(value = "/{roomId}/dnd", consumes = "application/json")
    @Operation(operationId = "changeStaffHousekeepingDnd", summary = "Change DND independently of cleaning",
            description = "OPERATIONS_MANAGE; exact persisted expectedUpdatedAt. Same value is a no-op; conflicting versions return 409. Does not alter cleaning, occupancy or availability.")
    @ApiResponse(responseCode = "404", description = "Room absent from the authorized property", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Untracked room or stale version", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public RoomState dnd(HttpServletRequest request, @PathVariable @Parameter(schema = @Schema(type = "string", format = "uuid")) String propertyId, @PathVariable @Parameter(schema = @Schema(type = "string", format = "uuid")) String roomId,
            @Valid @RequestBody DndRequest body, @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        noQuery(request); return service.dnd(principal, id(propertyId), id(roomId), body.expectedUpdatedAt(), body.dnd());
    }
    private static void noQuery(HttpServletRequest request) {
        if (!request.getParameterMap().isEmpty()) throw new IllegalArgumentException("Query parameters are not supported");
    }
    private static UUID id(String value) {
        if (!value.matches("[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}")) throw new IllegalArgumentException("UUID required");
        return UUID.fromString(value);
    }
}
