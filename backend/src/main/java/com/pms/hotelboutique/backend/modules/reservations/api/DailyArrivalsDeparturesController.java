package com.pms.hotelboutique.backend.modules.reservations.api;

import com.pms.hotelboutique.backend.modules.reservations.application.DailyArrivalsDeparturesReport;
import com.pms.hotelboutique.backend.modules.reservations.application.DailyArrivalsDeparturesService;
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
public class DailyArrivalsDeparturesController {
    private final DailyArrivalsDeparturesService reports;

    public DailyArrivalsDeparturesController(DailyArrivalsDeparturesService reports) { this.reports = reports; }

    @GetMapping("/api/v1/reports/arrivals-departures/daily")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Consultar llegadas y salidas pendientes por día",
            description = "Staff RESERVATION_MANAGE o COMMERCIAL_MANAGE; ALL_PROPERTIES además MULTI_PROPERTY_READ. "
                    + "Fechas programadas locales inclusivas; máximo 366 días y 50000 filas. Exactamente propertyId o scope. "
                    + "Llegadas RESERVED; salidas RESERVED/IN_HOUSE; padre PENDING/CONFIRMED. "
                    + "Estado actual, sin movimientos efectivos, PII ni reconstrucción histórica.")
    @Parameters({
            @Parameter(name = "from", in = ParameterIn.QUERY, required = true, schema = @Schema(type = "string", format = "date")),
            @Parameter(name = "to", in = ParameterIn.QUERY, required = true, schema = @Schema(type = "string", format = "date")),
            @Parameter(name = "propertyId", in = ParameterIn.QUERY, description = "UUID autorizado; exclusivo con scope", schema = @Schema(type = "string", format = "uuid")),
            @Parameter(name = "scope", in = ParameterIn.QUERY, description = "Exclusivo con propertyId", schema = @Schema(type = "string", allowableValues = "ALL_PROPERTIES"))
    })
    @ApiResponse(responseCode = "200", description = "Filas propertyId/date ordenadas; incluye ceros reales.",
            headers = @Header(name = "Cache-Control", schema = @Schema(type = "string", allowableValues = "private, no-store")),
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = DailyArrivalsDeparturesReport.class)))
    @ApiResponse(responseCode = "400", description = "Filtros/fechas/límites inválidos", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Sesión Staff requerida o revocada; Guest no autorizado", content = @Content)
    @ApiResponse(responseCode = "403", description = "Permiso o scope no autorizado", content = @Content)
    @ApiResponse(responseCode = "503", description = "Fuente no disponible", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<DailyArrivalsDeparturesReport> daily(HttpServletRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal StaffPrincipal principal) {
        var filters = ArrivalsDeparturesFilters.parse(request);
        return ResponseEntity.ok().header("Cache-Control", "private, no-store")
                .body(reports.read(principal, filters.propertyId(), filters.from(), filters.to()));
    }
}
