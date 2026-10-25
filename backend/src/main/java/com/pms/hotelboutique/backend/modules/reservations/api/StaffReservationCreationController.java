package com.pms.hotelboutique.backend.modules.reservations.api;

import com.pms.hotelboutique.backend.modules.reservations.application.StaffReservationCreationService;
import com.pms.hotelboutique.backend.modules.reservations.application.StaffReservationCreationService.*;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reservations")
@Tag(name = "Staff reservations")
@SecurityRequirement(name = "bearerAuth")
@ApiResponse(responseCode = "400", description = "Invalid explicit property, dates, quantity, body or idempotency key", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(responseCode = "401", description = "Staff session required")
@ApiResponse(responseCode = "403", description = "Current RESERVATION_MANAGE or property membership denied")
@ApiResponse(responseCode = "404", description = "Property or room type unavailable inside authorized scope", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(responseCode = "409", description = "NO_AVAILABILITY, PRICE_CHANGED, RATE_CONFIGURATION_UNAVAILABLE or IDEMPOTENCY_KEY_REUSED", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
@ApiResponse(responseCode = "500", description = "BOOKING_FAILED; no partial local writes", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
public class StaffReservationCreationController {
    private final StaffReservationCreationService service;
    public StaffReservationCreationController(StaffReservationCreationService service) { this.service = service; }

    @GetMapping("/creation-options")
    @Operation(operationId = "quoteStaffReservation", summary = "Read current Staff booking options",
            description = "Live Staff RESERVATION_MANAGE and explicit PROPERTY scope. Uses the same authoritative GTQ pricing as public booking. Only priced types with enough ATS are offered; no capacity is fabricated. Local arrival from today, exclusive departure. This snapshot never allocates inventory.")
    @ApiResponse(responseCode = "200", description = "Scoped price and availability snapshot, possibly empty", content = @Content(mediaType = "application/json", schema = @Schema(implementation = Quote.class)), headers = @Header(name = "Cache-Control", schema = @Schema(type = "string"), description = "private, no-store"))
    public ResponseEntity<Quote> quote(HttpServletRequest request, @RequestParam UUID propertyId,
            @RequestParam String arrival, @RequestParam String departure, @RequestParam int rooms,
            @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        validate(request, Set.of("propertyId", "arrival", "departure", "rooms"));
        return ResponseEntity.ok().header("Cache-Control", "private, no-store")
                .body(service.quote(principal, propertyId, day(arrival), day(departure), rooms));
    }

    @PostMapping(consumes = "application/json", produces = "application/json")
    @Operation(operationId = "createStaffReservation", summary = "Create a confirmed Staff reservation with an unpaid lodging charge",
            description = "Live Staff RESERVATION_MANAGE and explicit PROPERTY scope. One transaction admits inventory, creates GuestProfile/Reservation/N RESERVED stays, confirms the reservation and posts exactly one unpaid lodging CHARGE. No GuestAccount, payment, physical room assignment or check-in. Audit uses the authenticated Staff actor. Idempotency-Key replays the original immutable receipt even after later state changes; another body is 409. Refresh detail for current state. Prices and property eligibility are revalidated under admission locks.")
    @ApiResponse(responseCode = "201", description = "Immutable creation receipt or original replay", content = @Content(mediaType = "application/json", schema = @Schema(implementation = Created.class)), headers = @Header(name = "Cache-Control", schema = @Schema(type = "string"), description = "private, no-store"))
    public ResponseEntity<Created> create(HttpServletRequest request, @RequestParam UUID propertyId,
            @RequestHeader("Idempotency-Key") @Parameter(description = "Opaque 8–128 character key, preserved verbatim; reuse exact body after uncertain transport", schema = @Schema(minLength = 8, maxLength = 128)) String key,
            @Valid @RequestBody Request body,
            @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        validate(request, Set.of("propertyId"));
        return ResponseEntity.status(201).header("Cache-Control", "private, no-store")
                .body(service.create(principal, propertyId, key, body));
    }

    private static LocalDate day(String value) {
        if (value == null || !value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) throw new IllegalArgumentException("Calendar date required");
        try { return LocalDate.parse(value); }
        catch (java.time.DateTimeException error) { throw new IllegalArgumentException("Calendar date required"); }
    }
    private static void validate(HttpServletRequest request, Set<String> expected) {
        var params = request.getParameterMap();
        if (!params.keySet().equals(expected) || params.values().stream().anyMatch(v -> v.length != 1)
                || !params.get("propertyId")[0].matches("[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}"))
            throw new IllegalArgumentException("Explicit single property and known parameters required");
    }
}
