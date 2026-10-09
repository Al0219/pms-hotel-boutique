package com.pms.hotelboutique.backend.modules.reservations.api;

import com.pms.hotelboutique.backend.modules.reservations.application.StaffReservationReadService;
import com.pms.hotelboutique.backend.modules.reservations.application.StaffReservationReadService.StaffReservation;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import org.springframework.http.ProblemDetail;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reservations")
@Tag(name = "Staff reservations")
@SecurityRequirement(name = "bearerAuth")
@ApiResponse(responseCode = "400", description = "Invalid, missing, duplicate or unknown parameters", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(responseCode = "401", description = "Staff session required; Guest credentials are rejected", content = @Content)
@ApiResponse(responseCode = "403", description = "RESERVATION_MANAGE or property membership missing", content = @Content)
public class StaffReservationController {
    private final StaffReservationReadService reads;
    private final com.pms.hotelboutique.backend.modules.reservations.application.StaffRoomAssignmentService assignments;
    public StaffReservationController(StaffReservationReadService reads,
            com.pms.hotelboutique.backend.modules.reservations.application.StaffRoomAssignmentService assignments) {
        this.reads = reads; this.assignments = assignments;
    }

    @GetMapping("/{reservationId}/stays/{stayId}/room-assignment")
    @Operation(operationId = "previewStaffRoomAssignment", summary = "Available physical rooms for an unassigned stay",
            description = "Staff RESERVATION_MANAGE with live PROPERTY scope. Same authorized property and RoomType; exclusive departure; excludes overlapping RESERVED/IN_HOUSE and unreleased OOO/OOS.")
    @ApiResponse(responseCode = "200", description = "Available candidates", content = @Content(mediaType = "application/json", schema = @Schema(implementation = com.pms.hotelboutique.backend.modules.reservations.application.StaffRoomAssignmentService.Preview.class)),
            headers = @Header(name = "Cache-Control", schema = @Schema(type = "string"), description = "private, no-store"))
    @ApiResponse(responseCode = "404", description = "Reservation or stay outside requested property", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<?> assignmentPreview(HttpServletRequest request, @RequestParam UUID propertyId,
            @PathVariable UUID reservationId, @PathVariable UUID stayId,
            @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        validate(request);
        return ResponseEntity.ok().header("Cache-Control", "private, no-store")
                .body(assignments.preview(principal, propertyId, reservationId, stayId));
    }

    public record AssignRoomRequest(@jakarta.validation.constraints.NotNull UUID room_id) {
        @com.fasterxml.jackson.annotation.JsonAnySetter
        public void rejectUnknown(String key, Object value) { throw new IllegalArgumentException("Unknown assignment field"); }
    }

    @PutMapping("/{reservationId}/stays/{stayId}/room-assignment")
    @Operation(operationId = "assignStaffStayRoom", summary = "Assign a physical room once to an unassigned stay",
            description = "Transactional Staff RESERVATION_MANAGE with live PROPERTY scope. Locks stay and room, revalidates candidates and records append-only Staff audit. Existing assignments, including identical retries, return 409 without mutation.")
    @ApiResponse(responseCode = "200", description = "Persisted initial assignment", content = @Content(mediaType = "application/json", schema = @Schema(implementation = com.pms.hotelboutique.backend.modules.reservations.application.StaffRoomAssignmentService.Result.class)),
            headers = @Header(name = "Cache-Control", schema = @Schema(type = "string"), description = "private, no-store"))
    @ApiResponse(responseCode = "404", description = "Reservation, stay or room outside requested property", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Already assigned, ineligible stay, type mismatch or unavailable room", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<?> assignRoom(HttpServletRequest request, @RequestParam UUID propertyId,
            @PathVariable UUID reservationId, @PathVariable UUID stayId,
            @jakarta.validation.Valid @RequestBody AssignRoomRequest body,
            @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        validate(request);
        return ResponseEntity.ok().header("Cache-Control", "private, no-store")
                .body(assignments.assign(principal, propertyId, reservationId, stayId, body.room_id()));
    }

    @GetMapping
    @Operation(operationId = "listStaffReservations", summary = "List real reservations for one authorized property",
            description = "Staff RESERVATION_MANAGE and explicit PROPERTY scope, revalidated live. "
                    + "Unpaginated list ordered createdAt descending then reservationId. No financial or occupancy projection.")
    @ApiResponse(responseCode = "200", description = "Real reservation headers and stays, including an empty list",
            content = @Content(mediaType = "application/json", array = @ArraySchema(schema = @Schema(implementation = StaffReservation.class))),
            headers = @Header(name = "Cache-Control", schema = @Schema(type = "string"), description = "private, no-store"))
    public ResponseEntity<List<StaffReservation>> list(HttpServletRequest request,
            @RequestParam @Parameter(description = "Authorized property UUID; no ALL_PROPERTIES", required = true) UUID propertyId,
            @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        validate(request);
        return ResponseEntity.ok().header("Cache-Control", "private, no-store").body(reads.list(principal, propertyId));
    }

    @GetMapping("/{reservationId}")
    @Operation(operationId = "getStaffReservation", summary = "Read a real reservation and its stays",
            description = "Staff RESERVATION_MANAGE and explicit PROPERTY scope, revalidated live. "
                    + "Responsible GuestProfile is not an occupant list. No financial or occupancy projection.")
    @ApiResponse(responseCode = "200", description = "Scoped real reservation",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = StaffReservation.class)),
            headers = @Header(name = "Cache-Control", schema = @Schema(type = "string"), description = "private, no-store"))
    @ApiResponse(responseCode = "404", description = "Reservation absent from the requested authorized property", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<StaffReservation> detail(HttpServletRequest request,
            @RequestParam @Parameter(description = "Authorized property UUID", required = true) UUID propertyId,
            @PathVariable @Parameter(schema = @Schema(type = "string", format = "uuid")) String reservationId,
            @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        validate(request);
        if (!reservationId.matches("[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}"))
            throw new IllegalArgumentException("Reservation UUID required");
        return ResponseEntity.ok().header("Cache-Control", "private, no-store")
                .body(reads.detail(principal, propertyId, UUID.fromString(reservationId)));
    }

    private static void validate(HttpServletRequest request) {
        var parameters = request.getParameterMap();
        if (!parameters.keySet().equals(java.util.Set.of("propertyId"))
                || parameters.get("propertyId").length != 1
                || !parameters.get("propertyId")[0].matches("[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}"))
            throw new IllegalArgumentException("Explicit single property UUID required");
    }
}
