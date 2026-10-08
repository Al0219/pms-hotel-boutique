package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.commercial.domain.Agency;
import com.pms.hotelboutique.backend.modules.commercial.infrastructure.persistence.AgencyRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@Transactional
public class AgencyServiceImpl implements AgencyService {

    private final AgencyRepository agencies;
    private final AuditService audit;

    public AgencyServiceImpl(AgencyRepository agencies, AuditService audit) {
        this.agencies = agencies;
        this.audit = audit;
    }

    @Override
    public AgencyView create(StaffAuthorizationSnapshot authorization,
            @Valid CreateAgencyCommand command, UUID actorId) {
        CommercialAuthorization.requireManage(authorization);
        CommercialAuthorization.requireProperty(authorization, command.propertyId());
        Instant now = Instant.now();
        Agency agency;
        try {
            agency = new Agency(UUID.randomUUID(), command.propertyId(),
                    command.code(), command.name(), now);
        } catch (IllegalArgumentException e) {
            throw new CommercialException(e.getMessage(), e);
        }
        agency.updateContact(command.name(), command.commissionModel(),
                blankToNull(command.email()), blankToNull(command.phone()), now);
        Agency saved = agencies.save(agency);
        record(saved, "AGENCY_CREATED", null, "ACTIVE", actorId, null);
        return AgencyView.from(saved);
    }

    @Override
    public AgencyView update(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID agencyId,
            @Valid UpdateAgencyCommand command, UUID actorId) {
        CommercialAuthorization.requirePropertyScope(authorization, scope);
        Agency agency = scoped(authorization, scope, agencyId);
        String before = agency.getName();
        try {
            agency.updateContact(command.name(), command.commissionModel(),
                    blankToNull(command.email()), blankToNull(command.phone()), Instant.now());
        } catch (IllegalArgumentException e) {
            throw new CommercialException(e.getMessage(), e);
        }
        record(agency, "AGENCY_UPDATED", before, agency.getName(), actorId, null);
        return AgencyView.from(agency);
    }

    @Override
    public AgencyView activate(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID agencyId, UUID actorId) {
        CommercialAuthorization.requirePropertyScope(authorization, scope);
        Agency agency = scoped(authorization, scope, agencyId);
        Agency.Status before = agency.getStatus();
        agency.activate(Instant.now());
        record(agency, "AGENCY_ACTIVATED", String.valueOf(before),
                String.valueOf(agency.getStatus()), actorId, null);
        return AgencyView.from(agency);
    }

    @Override
    public AgencyView deactivate(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID agencyId, UUID actorId) {
        CommercialAuthorization.requirePropertyScope(authorization, scope);
        Agency agency = scoped(authorization, scope, agencyId);
        Agency.Status before = agency.getStatus();
        agency.deactivate(Instant.now());
        record(agency, "AGENCY_DEACTIVATED", String.valueOf(before),
                String.valueOf(agency.getStatus()), actorId, null);
        return AgencyView.from(agency);
    }

    @Override
    @Transactional(readOnly = true)
    public AgencyView get(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID agencyId) {
        return AgencyView.from(scoped(authorization, scope, agencyId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AgencyView> list(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope) {
        CommercialAuthorization.requireManage(authorization);
        return agencies.findAllInScope(CommercialAuthorization.requireScope(authorization, scope)).stream()
                .map(AgencyView::from).toList();
    }

    private Agency scoped(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID agencyId) {
        CommercialAuthorization.requireManage(authorization);
        if (agencyId == null) {
            throw new CommercialException("agency id is required");
        }
        AuthorizedPropertyScope resolved = CommercialAuthorization.requireScope(authorization, scope);
        return agencies.findByIdInScope(resolved, agencyId)
                .orElseThrow(() -> new CommercialException("agency not found"));
    }

    private void record(Agency agency, String action, String before, String after,
            UUID actorId, UUID correlationId) {
        ReservationAuditEvent.ActorType type = actorId == null
                ? ReservationAuditEvent.ActorType.SYSTEM
                : ReservationAuditEvent.ActorType.STAFF;
        audit.record(new AuditService.RecordAuditCommand(type, actorId, action, "AGENCY",
                agency.getId(), agency.getPropertyId(), before, after, null, correlationId));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
