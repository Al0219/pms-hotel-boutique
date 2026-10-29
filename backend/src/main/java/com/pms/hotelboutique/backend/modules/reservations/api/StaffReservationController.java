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
    private final com.pms.hotelboutique.backend.modules.reservations.application.StaffStayLifecycleService lifecycle;
    public StaffReservationController(StaffReservationReadService reads,
            com.pms.hotelboutique.backend.modules.reservations.application.StaffRoomAssignmentService assignments,
            com.pms.hotelboutique.backend.modules.reservations.application.StaffStayLifecycleService lifecycle) {
        this.reads = reads; this.assignments = assignments; this.lifecycle = lifecycle;
    }

    @Schema(name = "StaffStayLifecycleRequest", additionalProperties = Schema.AdditionalPropertiesValue.FALSE)
    public record TransitionRequest(
            @jakarta.validation.constraints.NotNull
            @Schema(allowableValues = {"RESERVED", "IN_HOUSE"}) com.pms.hotelboutique.backend.modules.reservations.domain.ReservationStay.Status expectedStatus,
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(min = 1, max = 40)
            @Schema(type = "string", format = "date-time", description = "Exact persisted updatedAt in UTC, ending in Z") String expectedUpdatedAt,
            @Schema(types = {"string", "null"}, format = "uuid", description = "Expected physical room; null for historical unassigned stays") String expectedRoomId) {
        @com.fasterxml.jackson.annotation.JsonAnySetter
        public void rejectUnknown(String key, Object value) { throw new IllegalArgumentException("Unknown lifecycle field"); }

        com.pms.hotelboutique.backend.modules.reservations.application.StaffStayLifecycleService.Expectation expectation() {
            try {
                if (expectedUpdatedAt == null || !expectedUpdatedAt.endsWith("Z")) throw new IllegalArgumentException("UTC timestamp required");
                return new com.pms.hotelboutique.backend.modules.reservations.application.StaffStayLifecycleService.Expectation(
                        expectedStatus, java.time.Instant.parse(expectedUpdatedAt), expectedRoomId == null ? null : uuid(expectedRoomId));
            } catch (java.time.DateTimeException e) { throw new IllegalArgumentException("Invalid UTC timestamp", e); }
        }
    }

    @PostMapping("/{reservationId}/stays/{stayId}/check-in")
    @Operation(operationId = "checkInStaffStay", summary = "Check in one confirmed reservation stay",
            description = "Staff RESERVATION_MANAGE with live PROPERTY scope. CONFIRMED parent and RESERVED stay, local arrival <= today < departure, assigned INSPECTED room without overlapping occupancy or OOO/OOS. Revalidates under locks and records Staff audit. Idempotency-Key replays the original operation receipt.")
    @ApiResponse(responseCode = "200", description = "Immutable completed operation; refresh detail for current state", content = @Content(mediaType = "application/json", schema = @Schema(implementation = com.pms.hotelboutique.backend.modules.reservations.application.StaffStayLifecycleService.Result.class)), headers = @Header(name = "Cache-Control", schema = @Schema(type = "string"), description = "private, no-store"))
    @ApiResponse(responseCode = "404", description = "Reservation/stay/room absent inside property", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Stale state, invalid local dates, unconfirmed reservation, unavailable or uninspected room, or reused key with different payload", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<com.pms.hotelboutique.backend.modules.reservations.application.StaffStayLifecycleService.Result> checkIn(
            HttpServletRequest request, @RequestParam UUID propertyId,
            @PathVariable @Parameter(schema = @Schema(type = "string", format = "uuid")) String reservationId,
            @PathVariable @Parameter(schema = @Schema(type = "string", format = "uuid")) String stayId,
            @RequestHeader("Idempotency-Key") @Parameter(description = "Opaque 8–128 character key; same Staff/property/action/payload replays original result", schema = @Schema(minLength = 8, maxLength = 128)) String key,
            @jakarta.validation.Valid @RequestBody TransitionRequest body,
            @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        validate(request);
        return ResponseEntity.ok().header("Cache-Control", "private, no-store").body(lifecycle.checkIn(
                principal, propertyId, uuid(reservationId), uuid(stayId), key, body.expectation()));
    }

    @PostMapping("/{reservationId}/stays/{stayId}/check-out")
    @Operation(operationId = "checkOutStaffStay", summary = "Check out one stay only when every linked folio has a verifiable nonpositive balance",
            description = "Staff RESERVATION_MANAGE with live PROPERTY scope. IN_HOUSE only; early departure preserves original dates and charges. Every reservation folio must have ledger entries and no positive balance; credits in other folios do not offset debt. No folio or empty ledger blocks checkout. Serializes with financial writers and atomically commits CHECKED_OUT, DIRTY and Staff audit. No payment, refund or folio closure. Idempotency-Key replays original receipt without repeating effects.")
    @ApiResponse(responseCode = "200", description = "Immutable completed operation; refresh detail for current state", content = @Content(mediaType = "application/json", schema = @Schema(implementation = com.pms.hotelboutique.backend.modules.reservations.application.StaffStayLifecycleService.Result.class)), headers = @Header(name = "Cache-Control", schema = @Schema(type = "string"), description = "private, no-store"))
    @ApiResponse(responseCode = "404", description = "Reservation or stay absent inside property", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Stale state, outstanding or unverifiable balance, or reused key with different payload; safe code in ProblemDetail", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<com.pms.hotelboutique.backend.modules.reservations.application.StaffStayLifecycleService.Result> checkOut(
            HttpServletRequest request, @RequestParam UUID propertyId,
            @PathVariable @Parameter(schema = @Schema(type = "string", format = "uuid")) String reservationId,
            @PathVariable @Parameter(schema = @Schema(type = "string", format = "uuid")) String stayId,
            @RequestHeader("Idempotency-Key") @Parameter(description = "Opaque 8–128 character key; reuse exact request after uncertain transport", schema = @Schema(minLength = 8, maxLength = 128)) String key,
            @jakarta.validation.Valid @RequestBody TransitionRequest body,
            @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        validate(request);
        return ResponseEntity.ok().header("Cache-Control", "private, no-store").body(lifecycle.checkOut(
                principal, propertyId, uuid(reservationId), uuid(stayId), key, body.expectation()));
    }

    private static UUID uuid(String value) {
        if (value == null || !value.matches("[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}"))
            throw new IllegalArgumentException("UUID required");
        return UUID.fromString(value);
    }

    @GetMapping("/{reservationId}/stays/{stayId}/room-assignment")
    @Operation(operationId = "previewStaffRoomAssignment", summary = "Available physical rooms for an unassigned stay",
            description = "Staff RESERVATION_MANAGE with live PROPERTY scope. Same authorized property and RoomType; exclusive departure; excludes overlapping RESERVED/IN_HOUSE and unreleased OOO/OOS. DIRTY rooms remain visible but are not selectable and include a blocking reason. CLEAN or untracked rooms may be preassigned before inspection; this does not authorize check-in or handing over the room.")
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
            description = "Transactional Staff RESERVATION_MANAGE with live PROPERTY scope. Locks stay and room, revalidates candidates and current cleaning status, rejecting DIRTY rooms, and records append-only Staff audit. Existing assignments, including identical retries, return 409 without mutation.")
    @ApiResponse(responseCode = "200", description = "Persisted initial assignment", content = @Content(mediaType = "application/json", schema = @Schema(implementation = com.pms.hotelboutique.backend.modules.reservations.application.StaffRoomAssignmentService.Result.class)),
            headers = @Header(name = "Cache-Control", schema = @Schema(type = "string"), description = "private, no-store"))
    @ApiResponse(responseCode = "404", description = "Reservation, stay or room outside requested property", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Already assigned, ineligible stay, type mismatch, unavailable or DIRTY room", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
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
                    + "Includes detail-only responsible GuestProfile contact (document masked), registered occupants per stay, notes and updatedAt. "
                    + "Responsible GuestProfile is separate from occupants and GuestAccount. No inferred adult/child counts or financial projection.")
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
