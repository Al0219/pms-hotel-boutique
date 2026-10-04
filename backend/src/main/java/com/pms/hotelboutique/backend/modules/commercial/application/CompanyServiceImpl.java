package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.commercial.domain.Company;
import com.pms.hotelboutique.backend.modules.commercial.infrastructure.persistence.CompanyRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@Transactional
public class CompanyServiceImpl implements CompanyService {

    private final CompanyRepository companies;
    private final AuditService audit;

    public CompanyServiceImpl(CompanyRepository companies, AuditService audit) {
        this.companies = companies;
        this.audit = audit;
    }

    @Override
    public CompanyView create(StaffAuthorizationSnapshot authorization,
            @Valid CreateCompanyCommand command, UUID actorId) {
        CommercialAuthorization.requireManage(authorization);
        requirePropertyMembership(authorization, command.propertyId());
        Instant now = Instant.now();
        Company company;
        try {
            company = new Company(UUID.randomUUID(), command.propertyId(),
                    command.code(), command.name(), now);
        } catch (IllegalArgumentException e) {
            throw new CommercialException(e.getMessage(), e);
        }
        company.updateContact(command.name(), command.taxId(), blankToNull(command.email()),
                blankToNull(command.phone()), now);
        Company saved = companies.save(company);
        record(saved, "COMPANY_CREATED", null, "ACTIVE", actorId, null);
        return CompanyView.from(saved);
    }

    @Override
    public CompanyView update(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID companyId,
            @Valid UpdateCompanyCommand command, UUID actorId) {
        Company company = scoped(authorization, scope, companyId);
        String before = company.getName();
        try {
            company.updateContact(command.name(), command.taxId(), blankToNull(command.email()),
                    blankToNull(command.phone()), Instant.now());
        } catch (IllegalArgumentException e) {
            throw new CommercialException(e.getMessage(), e);
        }
        record(company, "COMPANY_UPDATED", before, company.getName(), actorId, null);
        return CompanyView.from(company);
    }

    @Override
    public CompanyView activate(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID companyId, UUID actorId) {
        Company company = scoped(authorization, scope, companyId);
        Company.Status before = company.getStatus();
        company.activate(Instant.now());
        record(company, "COMPANY_ACTIVATED", String.valueOf(before),
                String.valueOf(company.getStatus()), actorId, null);
        return CompanyView.from(company);
    }

    @Override
    public CompanyView deactivate(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID companyId, UUID actorId) {
        Company company = scoped(authorization, scope, companyId);
        Company.Status before = company.getStatus();
        company.deactivate(Instant.now());
        record(company, "COMPANY_DEACTIVATED", String.valueOf(before),
                String.valueOf(company.getStatus()), actorId, null);
        return CompanyView.from(company);
    }

    @Override
    @Transactional(readOnly = true)
    public CompanyView get(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID companyId) {
        return CompanyView.from(scoped(authorization, scope, companyId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompanyView> list(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope) {
        CommercialAuthorization.requireManage(authorization);
        return companies.findAllInScope(authorizedScope(scope)).stream()
                .map(CompanyView::from).toList();
    }

    private Company scoped(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID companyId) {
        CommercialAuthorization.requireManage(authorization);
        if (companyId == null) {
            throw new CommercialException("company id is required");
        }
        AuthorizedPropertyScope resolved = authorizedScope(scope);
        return companies.findByIdInScope(resolved, companyId)
                .orElseThrow(() -> new CommercialException("company not found"));
    }

    private void record(Company company, String action, String before, String after,
            UUID actorId, UUID correlationId) {
        ReservationAuditEvent.ActorType type = actorId == null
                ? ReservationAuditEvent.ActorType.SYSTEM
                : ReservationAuditEvent.ActorType.STAFF;
        audit.record(new AuditService.RecordAuditCommand(type, actorId, action, "COMPANY",
                company.getId(), company.getPropertyId(), before, after, null, correlationId));
    }

    private static void requirePropertyMembership(StaffAuthorizationSnapshot authorization,
            UUID propertyId) {
        if (propertyId == null) {
            throw new CommercialException("property id is required");
        }
        boolean allowed = authorization.properties() != null && authorization.properties().stream()
                .anyMatch(property -> property.propertyId().equals(propertyId));
        if (!allowed) {
            throw new AccessDeniedException("The active Staff session is not authorized for this property");
        }
    }

    private static AuthorizedPropertyScope authorizedScope(AuthorizedPropertyScope scope) {
        if (scope == null || scope.propertyIds() == null || scope.propertyIds().isEmpty()) {
            throw new CommercialException("an explicit property scope is required");
        }
        return scope;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
