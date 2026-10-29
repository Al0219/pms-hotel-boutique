package com.pms.hotelboutique.backend.modules.operations.api;

import com.pms.hotelboutique.backend.modules.operations.application.CurrentHousekeepingReport;
import com.pms.hotelboutique.backend.modules.operations.application.CurrentHousekeepingReportService;
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
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Reports")
public class CurrentHousekeepingReportController {
    private final CurrentHousekeepingReportService reports;

    public CurrentHousekeepingReportController(CurrentHousekeepingReportService reports) { this.reports = reports; }

    @GetMapping("/api/v1/reports/housekeeping/current")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Consultar situación actual de housekeeping",
            description = "Staff OPERATIONS_MANAGE y property membership activa; ALL_PROPERTIES además MULTI_PROPERTY_READ. "
                    + "Una fila por property autorizada, incluso sin rooms. Incluye rooms físicas OOO/OOS, distingue sin "
                    + "seguimiento y DND transversal. Sin fechas, actividad histórica, PII ni disponibilidad vendible.")
    @Parameters({
            @Parameter(name = "propertyId", in = ParameterIn.QUERY, description = "UUID autorizado; exclusivo con scope", schema = @Schema(type = "string", format = "uuid")),
            @Parameter(name = "scope", in = ParameterIn.QUERY, description = "Exclusivo con propertyId", schema = @Schema(type = "string", allowableValues = "ALL_PROPERTIES"))
    })
    @ApiResponse(responseCode = "200", description = "Contadores actuales ordenados por propertyId; cero real si no hay rooms.",
            headers = @Header(name = "Cache-Control", schema = @Schema(type = "string", allowableValues = "private, no-store")),
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = CurrentHousekeepingReport.class)))
    @ApiResponse(responseCode = "400", description = "Filtro inválido", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Sesión Staff requerida o revocada", content = @Content)
    @ApiResponse(responseCode = "403", description = "Permiso o scope no autorizado", content = @Content)
    @ApiResponse(responseCode = "503", description = "Fuente no disponible", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<CurrentHousekeepingReport> current(HttpServletRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        var filters = CurrentHousekeepingFilters.parse(request);
        return ResponseEntity.ok().header("Cache-Control", "private, no-store")
                .body(reports.read(principal, filters.propertyId()));
    }
}
