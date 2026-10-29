package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.DailyOnBooksRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.application.PropertyScopeResolver;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@Transactional(readOnly = true)
public class DailyOnBooksServiceImpl implements DailyOnBooksService {
    private static final long MAX_NIGHTS = 366;
    private static final long MAX_ROWS = 50_000;

    private final StaffAuthService sessions;
    private final StaffAuthorizationService authorization;
    private final PropertyScopeResolver scopes;
    private final DailyOnBooksRepository repository;
    private final AuditService audit;
    private final ObjectMapper json;

    public DailyOnBooksServiceImpl(StaffAuthService sessions, StaffAuthorizationService authorization,
            PropertyScopeResolver scopes, DailyOnBooksRepository repository, AuditService audit, ObjectMapper json) {
        this.sessions = sessions;
        this.authorization = authorization;
        this.scopes = scopes;
        this.repository = repository;
        this.audit = audit;
        this.json = json;
    }

    @Override
    public DailyOnBooksReport forProperty(StaffPrincipal principal, UUID propertyId,
            LocalDate from, LocalDate to) {
        StaffAuthorizationSnapshot snapshot = authorize(principal);
        AuthorizedPropertyScope scope = scopes.resolveProperty(snapshot, propertyId);
        return calculate(scope, from, to);
    }

    @Override
    public DailyOnBooksReport forAllAuthorizedProperties(StaffPrincipal principal,
            LocalDate from, LocalDate to) {
        return calculate(allScope(principal), from, to);
    }

    private AuthorizedPropertyScope allScope(StaffPrincipal principal) {
        StaffAuthorizationSnapshot snapshot = authorize(principal);
        if (!snapshot.hasPermission("MULTI_PROPERTY_READ")) {
            throw new AccessDeniedException("ALL_PROPERTIES requires MULTI_PROPERTY_READ");
        }
        return scopes.resolveAllProperties(snapshot);
    }

    @Override
    @Transactional
    public byte[] exportForProperty(StaffPrincipal principal, UUID propertyId, LocalDate from, LocalDate to) {
        var scope = scopes.resolveProperty(authorize(principal), propertyId);
        return export(principal, scope, from, to);
    }

    @Override
    @Transactional
    public byte[] exportForAllAuthorizedProperties(StaffPrincipal principal, LocalDate from, LocalDate to) {
        return export(principal, allScope(principal), from, to);
    }

    private byte[] export(StaffPrincipal principal, AuthorizedPropertyScope scope, LocalDate from, LocalDate to) {
        var report = calculate(scope, from, to);
        byte[] bytes = DailyOnBooksCsv.serialize(report);
        UUID generation = UUID.randomUUID();
        var counts = report.nights().stream().collect(java.util.stream.Collectors.groupingBy(
                DailyOnBooksReport.Night::propertyId, java.util.stream.Collectors.counting()));
        for (UUID propertyId : scope.propertyIds().stream().sorted().toList()) {
            long count = counts.getOrDefault(propertyId, 0L);
            String metadata = json.writeValueAsString(Map.of("organizationId", scope.organizationId().toString(),
                    "report", "ON_BOOKS_DAILY", "format", "CSV", "from", from.toString(), "to", to.toString(),
                    "requestedScope", scope.type().name(), "calculatedAt", report.calculatedAt().toString(), "rowCount", count));
            audit.record(new AuditService.RecordAuditCommand(ReservationAuditEvent.ActorType.STAFF,
                    principal.staffUserId(), "REPORT_EXPORT_GENERATED", "REPORT_EXPORT", generation, propertyId,
                    null, metadata, null, generation));
        }
        // Spring commits/flushes all events before this proxied service returns to HTTP.
        return bytes;
    }

    private StaffAuthorizationSnapshot authorize(StaffPrincipal principal) {
        if (principal == null) {
            throw new StaffAuthenticationException();
        }
        var active = sessions.getActivePrincipal(principal);
        var snapshot = authorization.resolve(active.staffUserId());
        if (!snapshot.hasPermission("COMMERCIAL_MANAGE") && !snapshot.hasPermission("RESERVATION_MANAGE")) {
            throw new AccessDeniedException("Staff cannot read on-books reporting");
        }
        return snapshot;
    }

    private DailyOnBooksReport calculate(AuthorizedPropertyScope scope, LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from)) {
            throw new IllegalArgumentException("valid from/to stay dates are required");
        }
        long nights = ChronoUnit.DAYS.between(from, to) + 1;
        if (nights > MAX_NIGHTS || nights * scope.propertyIds().size() > MAX_ROWS) {
            throw new IllegalArgumentException("report range exceeds the approved limits");
        }
        List<DailyOnBooksReport.Night> rows = repository.findCurrent(scope, from, to).stream()
                .map(row -> {
                    long available = row.physicalRooms() - row.outOfOrderRooms();
                    BigDecimal percent = available == 0 ? null : BigDecimal.valueOf(row.onBooksRooms())
                            .multiply(BigDecimal.valueOf(100))
                            .divide(BigDecimal.valueOf(available), 2, RoundingMode.HALF_UP);
                    return new DailyOnBooksReport.Night(row.propertyId(), row.timezone(), row.currency(),
                            row.stayDate(), row.physicalRooms(), row.outOfOrderRooms(), available,
                            row.onBooksRooms(), percent, available == 0 ? "NO_AVAILABLE_ROOMS" : null);
                }).sorted(Comparator.comparing((DailyOnBooksReport.Night row) -> row.propertyId().toString())
                        .thenComparing(DailyOnBooksReport.Night::stayDate)).toList();
        return new DailyOnBooksReport(Instant.now(), rows);
    }
}
