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
import org.springframework.security.access.AccessDeniedException;
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
        requirePropertyMembership(authorization, command.propertyId());
        requireSamePropertyCompany(command.propertyId(), command.companyId());
        requireSamePropertyAgency(command.propertyId(), command.agencyId());
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
        EventGroup group = scoped(authorization, scope, groupId);
        requireSamePropertyCompany(group.getPropertyId(), command.companyId());
        requireSamePropertyAgency(group.getPropertyId(), command.agencyId());
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
        return groups.findAllInScope(authorizedScope(scope)).stream()
                .map(EventGroupView::from).toList();
    }

    EventGroup scoped(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID groupId) {
        CommercialAuthorization.requireManage(authorization);
        if (groupId == null) {
            throw new CommercialException("group id is required");
        }
        AuthorizedPropertyScope resolved = authorizedScope(scope);
        return groups.findByIdInScope(resolved, groupId)
                .orElseThrow(() -> new CommercialException("group not found"));
    }

    private void requireSamePropertyCompany(UUID propertyId, UUID companyId) {
        if (companyId == null) {
            return;
        }
        UUID owner = companies.findById(companyId)
                .orElseThrow(() -> new CommercialException("company not found")).getPropertyId();
        if (!propertyId.equals(owner)) {
            throw new CommercialException("company belongs to another property");
        }
    }

    private void requireSamePropertyAgency(UUID propertyId, UUID agencyId) {
        if (agencyId == null) {
            return;
        }
        UUID owner = agencies.findById(agencyId)
                .orElseThrow(() -> new CommercialException("agency not found")).getPropertyId();
        if (!propertyId.equals(owner)) {
            throw new CommercialException("agency belongs to another property");
        }
    }

    private void record(EventGroup group, String action, String before, String after,
            UUID actorId, UUID correlationId) {
        ReservationAuditEvent.ActorType type = actorId == null
                ? ReservationAuditEvent.ActorType.SYSTEM
                : ReservationAuditEvent.ActorType.STAFF;
        audit.record(new AuditService.RecordAuditCommand(type, actorId, action, "EVENT_GROUP",
                group.getId(), group.getPropertyId(), before, after, null, correlationId));
    }

    private static void requirePropertyMembership(StaffAuthorizationSnapshot authorization,
            UUID propertyId) {
        if (propertyId == null) {
            return;
        }
        boolean allowed = authorization.properties() != null && authorization.properties().stream()
                .anyMatch(property -> property.propertyId().equals(propertyId));
        if (!allowed) {
            throw new AccessDeniedException("The active Staff session is not authorized for this property");
        }
    }

    static AuthorizedPropertyScope authorizedScope(AuthorizedPropertyScope scope) {
        if (scope == null || scope.propertyIds() == null || scope.propertyIds().isEmpty()) {
            throw new CommercialException("an explicit property scope is required");
        }
        return scope;
    }
}
