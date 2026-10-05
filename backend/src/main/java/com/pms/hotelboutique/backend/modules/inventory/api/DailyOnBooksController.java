package com.pms.hotelboutique.backend.modules.inventory.api;

import com.pms.hotelboutique.backend.modules.inventory.application.DailyOnBooksReport;
import com.pms.hotelboutique.backend.modules.inventory.application.DailyOnBooksService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Parameters;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Reports", description = "Current on-books position for authorized Staff properties")
public class DailyOnBooksController {
    private static final Set<String> FILTERS = Set.of("from", "to", "propertyId", "scope");
    private static final Pattern UUID_FORMAT = Pattern.compile(
            "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");

    private final DailyOnBooksService reports;

    public DailyOnBooksController(DailyOnBooksService reports) {
        this.reports = reports;
    }

    @GetMapping("/api/v1/reports/on-books/daily")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Read current daily on-books rooms",
            description = "Requires Staff COMMERCIAL_MANAGE; ALL_PROPERTIES additionally requires "
                    + "MULTI_PROPERTY_READ. from/to are inclusive property-local stay dates. "
                    + "Results reflect current system state, not historical as-of or realized occupancy.")
    @Parameters({
            @Parameter(name = "from", required = true, description = "First local stay date, inclusive (YYYY-MM-DD)"),
            @Parameter(name = "to", required = true, description = "Last local stay date, inclusive (YYYY-MM-DD)"),
            @Parameter(name = "propertyId", description = "Authorized property UUID; exclusive with scope"),
            @Parameter(name = "scope", description = "ALL_PROPERTIES; exclusive with propertyId")
    })
    public ResponseEntity<DailyOnBooksResponse> daily(HttpServletRequest request,
            @AuthenticationPrincipal StaffPrincipal principal) {
        Map<String, String[]> parameters = request.getParameterMap();
        if (!FILTERS.containsAll(parameters.keySet())) {
            throw new IllegalArgumentException("unknown report filter");
        }
        String fromValue = required(parameters, "from");
        String toValue = required(parameters, "to");
        boolean single = parameters.containsKey("propertyId");
        boolean all = parameters.containsKey("scope");
        if (single == all) {
            throw new IllegalArgumentException("exactly one property scope is required");
        }
        LocalDate from = date(fromValue);
        LocalDate to = date(toValue);
        if (to.isBefore(from) || ChronoUnit.DAYS.between(from, to) >= 366) {
            throw new IllegalArgumentException("invalid report date range");
        }
        DailyOnBooksReport report;
        if (single) {
            String propertyValue = required(parameters, "propertyId");
            if (!UUID_FORMAT.matcher(propertyValue).matches()) {
                throw new IllegalArgumentException("invalid propertyId");
            }
            report = reports.forProperty(principal, UUID.fromString(propertyValue), from, to);
        } else {
            if (!"ALL_PROPERTIES".equals(required(parameters, "scope"))) {
                throw new IllegalArgumentException("invalid scope");
            }
            report = reports.forAllAuthorizedProperties(principal, from, to);
        }
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(new DailyOnBooksResponse(report.calculatedAt(), report.nights()));
    }

    private static String required(Map<String, String[]> parameters, String key) {
        String[] values = parameters.get(key);
        if (values == null || values.length != 1 || values[0].isBlank()) {
            throw new IllegalArgumentException("missing or repeated report filter");
        }
        return values[0];
    }

    private static LocalDate date(String value) {
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException("invalid stay date", exception);
        }
    }

    public record DailyOnBooksResponse(java.time.Instant calculatedAt, List<DailyOnBooksReport.Night> rows) { }
}
