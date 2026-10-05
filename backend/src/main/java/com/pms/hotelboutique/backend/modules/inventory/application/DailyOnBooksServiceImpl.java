package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.inventory.infrastructure.persistence.DailyOnBooksRepository;
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
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DailyOnBooksServiceImpl implements DailyOnBooksService {
    private static final String READ = "COMMERCIAL_MANAGE";
    private static final long MAX_NIGHTS = 366;
    private static final long MAX_ROWS = 50_000;

    private final StaffAuthService sessions;
    private final StaffAuthorizationService authorization;
    private final PropertyScopeResolver scopes;
    private final DailyOnBooksRepository repository;

    public DailyOnBooksServiceImpl(StaffAuthService sessions, StaffAuthorizationService authorization,
            PropertyScopeResolver scopes, DailyOnBooksRepository repository) {
        this.sessions = sessions;
        this.authorization = authorization;
        this.scopes = scopes;
        this.repository = repository;
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
        StaffAuthorizationSnapshot snapshot = authorize(principal);
        if (!snapshot.hasPermission("MULTI_PROPERTY_READ")) {
            throw new AccessDeniedException("ALL_PROPERTIES requires MULTI_PROPERTY_READ");
        }
        AuthorizedPropertyScope scope = scopes.resolveAllProperties(snapshot);
        return calculate(scope, from, to);
    }

    private StaffAuthorizationSnapshot authorize(StaffPrincipal principal) {
        if (principal == null) {
            throw new StaffAuthenticationException();
        }
        var active = sessions.getActivePrincipal(principal);
        var snapshot = authorization.resolve(active.staffUserId());
        if (!snapshot.hasPermission(READ)) {
            throw new AccessDeniedException("Staff cannot read commercial reporting");
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
