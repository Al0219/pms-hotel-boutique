package com.pms.hotelboutique.backend.modules.inventory.api;

import com.pms.hotelboutique.backend.modules.inventory.application.DailyOnBooksCsv;
import com.pms.hotelboutique.backend.modules.inventory.application.DailyOnBooksService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@Tag(name = "Reports")
public class DailyOnBooksCsvController {
    private final DailyOnBooksService reports;

    public DailyOnBooksCsvController(DailyOnBooksService reports) { this.reports = reports; }

    @GetMapping("/api/v1/reports/on-books/daily/export")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Export current daily on-books CSV", description = "Staff RESERVATION_MANAGE or COMMERCIAL_MANAGE; "
            + "ALL_PROPERTIES additionally requires MULTI_PROPERTY_READ. Inclusive local stay dates, maximum 366 nights and "
            + "50000 data rows. UTF-8 BOM, comma, CRLF, 11 columns. Audit records generation per authorized property, not delivery. "
            + "No realized occupancy, financial data, historical as-of, pagination or automatic replay.")
    @Parameters({
        @Parameter(name = "from", in = ParameterIn.QUERY, required = true, schema = @Schema(type = "string", format = "date")),
        @Parameter(name = "to", in = ParameterIn.QUERY, required = true, schema = @Schema(type = "string", format = "date")),
        @Parameter(name = "propertyId", in = ParameterIn.QUERY, description = "Authorized UUID; exclusive with scope", schema = @Schema(type = "string", format = "uuid")),
        @Parameter(name = "scope", in = ParameterIn.QUERY, description = "Explicit authorized portfolio; exclusive with propertyId", schema = @Schema(type = "string", allowableValues = "ALL_PROPERTIES"))
    })
    @ApiResponse(responseCode = "200", description = "Complete audited file; nullable percent is an empty cell, no truncation.",
        headers = {
            @Header(name = "Cache-Control", schema = @Schema(type = "string", allowableValues = "private, no-store")),
            @Header(name = "Content-Disposition", description = "attachment; filename=\"on-books-daily_FROM_TO.csv\"", schema = @Schema(type = "string")),
            @Header(name = "X-Content-Type-Options", schema = @Schema(type = "string", allowableValues = "nosniff"))
        }, content = @Content(mediaType = "text/csv", schema = @Schema(type = "string", format = "binary")))
    @ApiResponse(responseCode = "400", description = "Invalid filters or approved limits exceeded", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Missing, Guest, invalid or revoked Staff session", content = @Content)
    @ApiResponse(responseCode = "403", description = "Permission or property scope denied", content = @Content)
    @ApiResponse(responseCode = "406", description = "Accept incompatible with CSV; no generation", content = @Content)
    @ApiResponse(responseCode = "503", description = "Calculation, serialization or audit could not complete", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<byte[]> export(HttpServletRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        // Return 406 directly: a servlet sendError would redispatch to the protected /error route.
        if (!acceptsCsv(request.getHeader(HttpHeaders.ACCEPT))) {
            return ResponseEntity.status(HttpStatus.NOT_ACCEPTABLE).header(HttpHeaders.CACHE_CONTROL, "private, no-store").build();
        }
        var filters = DailyOnBooksFilters.parse(request);
        byte[] bytes = filters.propertyId() == null
                ? reports.exportForAllAuthorizedProperties(principal, filters.from(), filters.to())
                : reports.exportForProperty(principal, filters.propertyId(), filters.from(), filters.to());
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + DailyOnBooksCsv.filename(filters.from(), filters.to()) + "\"")
                .header("X-Content-Type-Options", "nosniff").body(bytes);
    }

    private boolean acceptsCsv(String accept) {
        if (accept == null || accept.isBlank()) return true;
        try {
            return MediaType.parseMediaTypes(accept).stream()
                    .filter(type -> type.isCompatibleWith(MediaType.parseMediaType("text/csv")))
                    .sorted(java.util.Comparator.<MediaType>comparingInt(type -> type.isWildcardType() ? 0 : type.isWildcardSubtype() ? 1 : 2)
                            .reversed().thenComparing(java.util.Comparator.comparingDouble(MediaType::getQualityValue).reversed()))
                    .findFirst().map(type -> type.getQualityValue() > 0).orElse(false);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }
}
