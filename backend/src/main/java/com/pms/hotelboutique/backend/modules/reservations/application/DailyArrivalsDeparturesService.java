package com.pms.hotelboutique.backend.modules.reservations.application;

import com.pms.hotelboutique.backend.modules.reservations.infrastructure.persistence.DailyArrivalsDeparturesRepository;
import com.pms.hotelboutique.backend.modules.securityauth.application.PropertyScopeResolver;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DailyArrivalsDeparturesService {
    private final StaffAuthService sessions;
    private final StaffAuthorizationService authorization;
    private final PropertyScopeResolver scopes;
    private final DailyArrivalsDeparturesRepository repository;

    public DailyArrivalsDeparturesService(StaffAuthService sessions, StaffAuthorizationService authorization,
            PropertyScopeResolver scopes, DailyArrivalsDeparturesRepository repository) {
        this.sessions = sessions;
        this.authorization = authorization;
        this.scopes = scopes;
        this.repository = repository;
    }

    /** Null propertyId represents explicit ALL_PROPERTIES, never a fallback. */
    public DailyArrivalsDeparturesReport read(StaffPrincipal principal, UUID propertyId, LocalDate from, LocalDate to) {
        if (principal == null) throw new StaffAuthenticationException();
        var snapshot = authorization.resolve(sessions.getActivePrincipal(principal).staffUserId());
        if (!snapshot.hasPermission("RESERVATION_MANAGE") && !snapshot.hasPermission("COMMERCIAL_MANAGE")) {
            throw new AccessDeniedException("Staff cannot read arrivals/departures reporting");
        }
        if (propertyId == null && !snapshot.hasPermission("MULTI_PROPERTY_READ")) {
            throw new AccessDeniedException("ALL_PROPERTIES requires MULTI_PROPERTY_READ");
        }
        var scope = propertyId == null ? scopes.resolveAllProperties(snapshot) : scopes.resolveProperty(snapshot, propertyId);
        if (from == null || to == null || to.isBefore(from)) throw new IllegalArgumentException("Invalid report dates");
        long days = ChronoUnit.DAYS.between(from, to) + 1;
        if (days > 366 || days * scope.propertyIds().size() > 50_000) {
            throw new IllegalArgumentException("Report exceeds approved limits");
        }
        var rows = repository.findCurrent(scope, from, to);
        return new DailyArrivalsDeparturesReport(Instant.now(), rows);
    }
}
