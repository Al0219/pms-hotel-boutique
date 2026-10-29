package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.CurrentHousekeepingReportRepository;
import com.pms.hotelboutique.backend.modules.securityauth.application.PropertyScopeResolver;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import java.time.Instant;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CurrentHousekeepingReportService {
    private final StaffAuthService sessions;
    private final StaffAuthorizationService authorization;
    private final PropertyScopeResolver scopes;
    private final CurrentHousekeepingReportRepository repository;

    public CurrentHousekeepingReportService(StaffAuthService sessions, StaffAuthorizationService authorization,
            PropertyScopeResolver scopes, CurrentHousekeepingReportRepository repository) {
        this.sessions = sessions;
        this.authorization = authorization;
        this.scopes = scopes;
        this.repository = repository;
    }

    /** Null propertyId represents explicit ALL_PROPERTIES, never an implicit fallback. */
    public CurrentHousekeepingReport read(StaffPrincipal principal, UUID propertyId) {
        if (principal == null) throw new StaffAuthenticationException();
        var snapshot = authorization.resolve(sessions.getActivePrincipal(principal).staffUserId());
        if (!snapshot.hasPermission("OPERATIONS_MANAGE")) {
            throw new AccessDeniedException("Staff cannot read housekeeping reporting");
        }
        if (propertyId == null && !snapshot.hasPermission("MULTI_PROPERTY_READ")) {
            throw new AccessDeniedException("ALL_PROPERTIES requires MULTI_PROPERTY_READ");
        }
        var scope = propertyId == null ? scopes.resolveAllProperties(snapshot) : scopes.resolveProperty(snapshot, propertyId);
        return new CurrentHousekeepingReport(Instant.now(), repository.findCurrent(scope));
    }
}
