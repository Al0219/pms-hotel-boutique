package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.ServiceRequestRepository;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.application.PropertyScopeResolver;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthenticationException;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class StaffServiceRequestServiceImpl implements StaffServiceRequestService {
    private static final String INTAKE = "SERVICE_REQUEST_INTAKE";
    private static final String OPERATIONS = "OPERATIONS_MANAGE";

    private final StaffAuthService sessions;
    private final StaffAuthorizationService authorization;
    private final PropertyScopeResolver scopes;
    private final ServiceRequestService requests;
    private final ServiceRequestRepository repository;
    private final JdbcClient jdbc;

    public StaffServiceRequestServiceImpl(StaffAuthService sessions,
            StaffAuthorizationService authorization, PropertyScopeResolver scopes,
            ServiceRequestService requests, ServiceRequestRepository repository, JdbcClient jdbc) {
        this.sessions = sessions;
        this.authorization = authorization;
        this.scopes = scopes;
        this.requests = requests;
        this.repository = repository;
        this.jdbc = jdbc;
    }

    @Override
    public ServiceRequestService.ServiceRequestView open(StaffPrincipal principal,
            ServiceRequestService.OpenRequestCommand command) {
        if (command == null) {
            throw new IllegalArgumentException("request is required");
        }
        var access = access(principal, command.propertyId());
        verifyLinkedContext(command);
        var trusted = new ServiceRequestService.OpenRequestCommand(command.propertyId(),
                command.category(), command.subject(), command.detail(), command.priority(),
                command.reservationId(), command.stayId(), command.roomId(),
                command.guestProfileId(), access.actorId(), command.dueAt());
        return requests.openRequest(trusted);
    }

    @Override
    @Transactional(readOnly = true)
    public ServiceRequestService.ServiceRequestView get(StaffPrincipal principal, UUID propertyId, UUID requestId) {
        access(principal, propertyId);
        if (requestId == null) {
            throw new IllegalArgumentException("requestId is required");
        }
        return repository.findByIdAndPropertyId(requestId, propertyId)
                .map(ServiceRequestService.ServiceRequestView::from)
                .orElseThrow(() -> new ServiceRequestException("service request not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceRequestService.ServiceRequestView> list(StaffPrincipal principal, UUID propertyId) {
        var access = access(principal, propertyId);
        return repository.findByPropertyIdIn(access.scope().propertyIds()).stream()
                .map(ServiceRequestService.ServiceRequestView::from).toList();
    }

    private Access access(StaffPrincipal principal, UUID propertyId) {
        if (principal == null) {
            throw new StaffAuthenticationException();
        }
        var active = sessions.getActivePrincipal(principal);
        var snapshot = authorization.resolve(active.staffUserId());
        if (!snapshot.hasPermission(INTAKE) && !snapshot.hasPermission(OPERATIONS)) {
            throw new AccessDeniedException("Staff cannot access service requests");
        }
        return new Access(active.staffUserId(), scopes.resolveProperty(snapshot, propertyId));
    }

    private void verifyLinkedContext(ServiceRequestService.OpenRequestCommand command) {
        UUID propertyId = command.propertyId();
        if (command.reservationId() != null && !exists(
                "SELECT EXISTS (SELECT 1 FROM reservations WHERE id=:id AND property_id=:propertyId)",
                command.reservationId(), propertyId)) {
            throw new ServiceRequestException("linked context not found in property");
        }
        if (command.stayId() != null && (command.reservationId() == null || !exists(
                "SELECT EXISTS (SELECT 1 FROM reservation_stays WHERE id=:id AND reservation_id=:reservationId AND property_id=:propertyId)",
                command.stayId(), propertyId, command.reservationId()))) {
            throw new ServiceRequestException("linked context not found in property");
        }
        if (command.roomId() != null && !exists(
                "SELECT EXISTS (SELECT 1 FROM rooms WHERE id=:id AND property_id=:propertyId)",
                command.roomId(), propertyId)) {
            throw new ServiceRequestException("linked context not found in property");
        }
        // Shared profiles need AD-05; this entry only accepts a profile explicitly linked to this property.
        if (command.guestProfileId() != null && !exists(
                "SELECT EXISTS (SELECT 1 FROM guest_profiles WHERE id=:id AND property_id=:propertyId)",
                command.guestProfileId(), propertyId)) {
            throw new ServiceRequestException("linked context not found in property");
        }
    }

    private boolean exists(String sql, UUID id, UUID propertyId) {
        return Boolean.TRUE.equals(jdbc.sql(sql).param("id", id).param("propertyId", propertyId)
                .query(Boolean.class).single());
    }

    private boolean exists(String sql, UUID id, UUID propertyId, UUID reservationId) {
        return Boolean.TRUE.equals(jdbc.sql(sql).param("id", id).param("propertyId", propertyId)
                .param("reservationId", reservationId).query(Boolean.class).single());
    }

    private record Access(UUID actorId, AuthorizedPropertyScope scope) { }
}
