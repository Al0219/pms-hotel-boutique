package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.commercial.domain.EventGroup;
import com.pms.hotelboutique.backend.modules.commercial.infrastructure.persistence.AgencyRepository;
import com.pms.hotelboutique.backend.modules.commercial.infrastructure.persistence.CompanyRepository;
import com.pms.hotelboutique.backend.modules.commercial.infrastructure.persistence.EventGroupRepository;
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
public class EventGroupServiceImpl implements EventGroupService {

    private final EventGroupRepository groups;
    private final CompanyRepository companies;
    private final AgencyRepository agencies;
    private final AuditService audit;

    public EventGroupServiceImpl(EventGroupRepository groups, CompanyRepository companies,
            AgencyRepository agencies, AuditService audit) {
        this.groups = groups;
        this.companies = companies;
        this.agencies = agencies;
        this.audit = audit;
    }

    @Override
    public EventGroupView create(StaffAuthorizationSnapshot authorization,
            @Valid CreateEventGroupCommand command, UUID actorId) {
        CommercialAuthorization.requireManage(authorization);
        CommercialAuthorization.requireProperty(authorization, command.propertyId());
        AuthorizedPropertyScope propertyScope = new AuthorizedPropertyScope(
                authorization.organizationId(), AuthorizedPropertyScope.Type.PROPERTY,
                java.util.Set.of(command.propertyId()));
        requireSamePropertyCompany(propertyScope, command.companyId());
        requireSamePropertyAgency(propertyScope, command.agencyId());
        Instant now = Instant.now();
        EventGroup group;
        try {
            group = new EventGroup(UUID.randomUUID(), command.propertyId(),
                    command.code(), command.name(), command.arrival(), command.departure(), now);
            group.updateDetails(command.name(), command.companyId(), command.agencyId(),
                    command.cutoffDate(), now);
        } catch (IllegalArgumentException e) {
            throw new CommercialException(e.getMessage(), e);
        }
        EventGroup saved = groups.save(group);
        record(saved, "GROUP_CREATED", null, "INQUIRY", actorId, null);
        return EventGroupView.from(saved);
    }

    @Override
    public EventGroupView update(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID groupId,
            @Valid UpdateEventGroupCommand command, UUID actorId) {
        CommercialAuthorization.requirePropertyScope(authorization, scope);
        EventGroup group = scoped(authorization, scope, groupId);
        AuthorizedPropertyScope propertyScope = new AuthorizedPropertyScope(
                authorization.organizationId(), AuthorizedPropertyScope.Type.PROPERTY,
                java.util.Set.of(group.getPropertyId()));
        requireSamePropertyCompany(propertyScope, command.companyId());
        requireSamePropertyAgency(propertyScope, command.agencyId());
        String before = group.getName();
        try {
            group.updateDetails(command.name(), command.companyId(), command.agencyId(),
                    command.cutoffDate(), Instant.now());
        } catch (IllegalArgumentException e) {
            throw new CommercialException(e.getMessage(), e);
        }
        record(group, "GROUP_UPDATED", before, group.getName(), actorId, null);
        return EventGroupView.from(group);
    }

    @Override
    public EventGroupView advance(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID groupId, UUID actorId) {
        CommercialAuthorization.requirePropertyScope(authorization, scope);
        EventGroup group = scoped(authorization, scope, groupId);
        EventGroup.Status before = group.getStatus();
        try {
            group.advance(Instant.now());
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw new CommercialException(e.getMessage(), e);
        }
        record(group, "GROUP_ADVANCED", String.valueOf(before),
                String.valueOf(group.getStatus()), actorId, null);
        return EventGroupView.from(group);
    }

    @Override
    @Transactional(readOnly = true)
    public EventGroupView get(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID groupId) {
        return EventGroupView.from(scoped(authorization, scope, groupId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<EventGroupView> list(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope) {
        CommercialAuthorization.requireManage(authorization);
        return groups.findAllInScope(CommercialAuthorization.requireScope(authorization, scope)).stream()
                .map(EventGroupView::from).toList();
    }

    EventGroup scoped(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID groupId) {
        CommercialAuthorization.requireManage(authorization);
        if (groupId == null) {
            throw new CommercialException("group id is required");
        }
        AuthorizedPropertyScope resolved = CommercialAuthorization.requireScope(authorization, scope);
        return groups.findByIdInScope(resolved, groupId)
                .orElseThrow(() -> new CommercialException("group not found"));
    }

    private void requireSamePropertyCompany(AuthorizedPropertyScope scope, UUID companyId) {
        if (companyId == null) {
            return;
        }
        companies.findByIdInScope(scope, companyId)
                .orElseThrow(() -> new CommercialException("company not found"));
    }

    private void requireSamePropertyAgency(AuthorizedPropertyScope scope, UUID agencyId) {
        if (agencyId == null) {
            return;
        }
        agencies.findByIdInScope(scope, agencyId)
                .orElseThrow(() -> new CommercialException("agency not found"));
    }

    private void record(EventGroup group, String action, String before, String after,
            UUID actorId, UUID correlationId) {
        ReservationAuditEvent.ActorType type = actorId == null
                ? ReservationAuditEvent.ActorType.SYSTEM
                : ReservationAuditEvent.ActorType.STAFF;
        audit.record(new AuditService.RecordAuditCommand(type, actorId, action, "EVENT_GROUP",
                group.getId(), group.getPropertyId(), before, after, null, correlationId));
    }

}
