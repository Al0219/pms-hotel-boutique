package com.pms.hotelboutique.backend.modules.inventory.api;

import com.pms.hotelboutique.backend.modules.inventory.application.DailyOnBooksReport;
import com.pms.hotelboutique.backend.modules.inventory.application.DailyOnBooksService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
@RestController
@Tag(name = "Reports", description = "Operational reporting for authorized Staff properties")
public class DailyOnBooksController {
    private final DailyOnBooksService reports;

    public DailyOnBooksController(DailyOnBooksService reports) {
        this.reports = reports;
    }

    @GetMapping("/api/v1/reports/on-books/daily")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Read current daily on-books rooms",
            description = "Requires Staff COMMERCIAL_MANAGE or RESERVATION_MANAGE; ALL_PROPERTIES additionally requires "
                    + "MULTI_PROPERTY_READ. from/to are inclusive property-local stay dates. "
                    + "Results reflect current system state, not historical as-of or realized occupancy. "
                    + "Máximo 366 noches y 50000 filas (propiedades autorizadas × noches). "
                    + "Exactamente propertyId o scope; rechaza duplicados/desconocidos. Sin paginación, cursor ni exportación.")
    @Parameters({
            @Parameter(name = "from", in = ParameterIn.QUERY, schema = @Schema(type = "string", format = "date"), required = true, description = "First local stay date, inclusive (YYYY-MM-DD)"),
            @Parameter(name = "to", in = ParameterIn.QUERY, schema = @Schema(type = "string", format = "date"), required = true, description = "Last local stay date, inclusive (YYYY-MM-DD)"),
            @Parameter(name = "propertyId", in = ParameterIn.QUERY, schema = @Schema(type = "string", format = "uuid"), description = "Authorized property UUID; exclusive with scope"),
            @Parameter(name = "scope", in = ParameterIn.QUERY, schema = @Schema(type = "string", allowableValues = "ALL_PROPERTIES"), description = "ALL_PROPERTIES; exclusive with propertyId")
    })
    @ApiResponse(responseCode = "200", description = "Filas ordenadas por propertyId/stayDate; sin Guest ni ingresos.",
        headers = @Header(name = "Cache-Control", description = "private, no-store", schema = @Schema(type = "string", allowableValues = "private, no-store")),
        content = @Content(mediaType = "application/json", schema = @Schema(implementation = DailyOnBooksResponse.class)))
    @ApiResponse(responseCode = "400", description = "Filtros incompatibles/desconocidos/duplicados, fecha/UUID inválido o límites excedidos.", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Identidad/sesión inválida o Guest.", content = @Content)
    @ApiResponse(responseCode = "403", description = "Permiso o propiedad no autorizados.", content = @Content)
    public ResponseEntity<DailyOnBooksResponse> daily(HttpServletRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        var filters = DailyOnBooksFilters.parse(request);
        DailyOnBooksReport report = filters.propertyId() == null
                ? reports.forAllAuthorizedProperties(principal, filters.from(), filters.to())
                : reports.forProperty(principal, filters.propertyId(), filters.from(), filters.to());
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(new DailyOnBooksResponse(report.calculatedAt(), report.nights()));
    }

    public record DailyOnBooksResponse(@Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Instante UTC de cálculo; no promete snapshot histórico.") java.time.Instant calculatedAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Máximo 50000 filas, ordenadas propertyId/stayDate; no paginadas.") List<DailyOnBooksReport.Night> rows) { }
}
