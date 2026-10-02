package com.pms.hotelboutique.backend.modules.inventory.api;

import com.pms.hotelboutique.backend.modules.inventory.application.InventoryAvailabilityQueryService;
import com.pms.hotelboutique.backend.modules.inventory.application.StayDateRange;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/properties")
@Tag(name = "Inventory", description = "Staff availability queries restricted to authorized properties")
public class InventoryController {
    private final InventoryAvailabilityQueryService queries;

    public InventoryController(InventoryAvailabilityQueryService queries) {
        this.queries = queries;
    }

    @GetMapping("/{propertyId}/availability")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Read sellable availability for one room type",
            description = "Requires an active Staff session, RESERVATION_MANAGE or COMMERCIAL_MANAGE, "
                    + "and authorization for propertyId. Property-local nights [arrival, departure). "
                    + "Returns minimum ATS, including zero; does not reserve inventory.")
    @ApiResponse(responseCode = "200", description = "Availability for the authorized property and room type",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = AvailabilityResponse.class)))
    @ApiResponse(responseCode = "400", description = "Missing or invalid UUID/date parameters, or arrival >= departure",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Missing, invalid, expired, revoked or non-Staff authentication", content = @Content)
    @ApiResponse(responseCode = "403", description = "Insufficient permission or unauthorized property", content = @Content)
    @ApiResponse(responseCode = "404", description = "Room type does not exist in the authorized property",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public AvailabilityResponse availability(@PathVariable UUID propertyId, @RequestParam UUID roomTypeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate arrival,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate departure) {
        var dates = new StayDateRange(arrival, departure);
        return new AvailabilityResponse(propertyId, roomTypeId, arrival, departure,
                queries.calculate(propertyId, roomTypeId, dates));
    }
}
