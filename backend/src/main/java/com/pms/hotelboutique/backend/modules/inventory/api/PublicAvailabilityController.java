package com.pms.hotelboutique.backend.modules.inventory.api;

import com.pms.hotelboutique.backend.modules.inventory.application.PublicAvailabilityQuery;
import com.pms.hotelboutique.backend.modules.inventory.application.PublicAvailabilityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Public availability", description = "Anonymous availability for active properties with authoritative demo GTQ pricing")
public class PublicAvailabilityController {
    private final PublicAvailabilityService availability;

    public PublicAvailabilityController(PublicAvailabilityService availability) { this.availability = availability; }

    @GetMapping(value = "/api/v1/public/availability", produces = "application/json")
    @SecurityRequirements
    @Operation(operationId = "publicAvailability", summary = "Read public sellable availability", security = {},
            description = "Anonymous: no Staff/Guest token or cookie required. Only ACTIVE properties; "
                    + "local nights [arrival, departure), arrival < departure and rooms > 0. "
                    + "Real ATS and GTQ demo rates; rooms filters capacity, totals are per room for the full range. "
                    + "Empty offers are 200; reading does not reserve or assign physical rooms.")
    @ApiResponse(responseCode = "200", description = "Real offers, including an empty list when no availability",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = PublicAvailabilityResponse.class)))
    @ApiResponse(responseCode = "400", description = "Missing or malformed query, arrival >= departure, or rooms <= 0",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Property missing or inactive",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "500", description = "Backend demo configuration error: DEMO_RATE_NOT_CONFIGURED or DEMO_CURRENCY_MISMATCH",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public PublicAvailabilityResponse availability(
            @Parameter(required = true, description = "UUID of an ACTIVE property") @RequestParam("propertyId") UUID propertyId,
            @Parameter(required = true, description = "Inclusive property-local arrival, YYYY-MM-DD") @RequestParam("arrival") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate arrival,
            @Parameter(required = true, description = "Exclusive property-local departure, YYYY-MM-DD") @RequestParam("departure") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate departure,
            @Parameter(required = true, description = "Required room units; positive integer", schema = @Schema(type = "integer", format = "int32", minimum = "1")) @RequestParam("rooms") int rooms) {
        return PublicAvailabilityResponse.from(availability.search(
                new PublicAvailabilityQuery(propertyId, arrival, departure, rooms)));
    }
}
