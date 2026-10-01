package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest;
import com.pms.hotelboutique.backend.modules.operations.infrastructure.persistence.ServiceRequestRepository;
import com.pms.hotelboutique.backend.modules.reservations.application.AuditService;
import com.pms.hotelboutique.backend.modules.reservations.domain.ReservationAuditEvent;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
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
public class ServiceRequestServiceImpl implements ServiceRequestService {

    private final ServiceRequestRepository requests;
    private final AuditService audit;

    public ServiceRequestServiceImpl(ServiceRequestRepository requests, AuditService audit) {
        this.requests = requests;
        this.audit = audit;
    }

    @Override
    public ServiceRequestView openRequest(@Valid OpenRequestCommand command) {
        Instant now = Instant.now();
        ServiceRequest request = new ServiceRequest(UUID.randomUUID(), command.propertyId(),
                command.category(), command.subject(), now);
        request.describe(command.detail() == null || command.detail().isBlank() ? null
                : command.detail().trim(),
                command.priority() == null ? ServiceRequest.Priority.MEDIUM : command.priority());
        try {
            request.linkContext(command.reservationId(), command.stayId(), command.roomId(),
                    command.guestProfileId());
        } catch (IllegalArgumentException e) {
            throw new ServiceRequestException(e.getMessage(), e);
        }
        if (command.reportedBy() != null) {
            request.reportBy(command.reportedBy());
        }
        if (command.dueAt() != null) {
            request.scheduleFor(command.dueAt(), now);
        }
        // Linked rows ride on foreign keys (reservations module, BD2 rooms,
        // BD3 profiles, BD1 staff); no parallel lookups are kept here.
        ServiceRequestView opened = ServiceRequestView.from(requests.save(request));
        record(request, "REQUEST_OPENED", null, "{\"status\":\"OPEN\"}", command.reportedBy());
        return opened;
    }

    @Override
    public ServiceRequestView startProgress(UUID requestId, UUID actorId) {
        return transition(requestId, "REQUEST_STARTED", actorId,
                (request, now) -> request.startProgress(now));
    }

    @Override
    public ServiceRequestView complete(UUID requestId, UUID actorId) {
        return transition(requestId, "REQUEST_COMPLETED", actorId,
                (request, now) -> request.complete(now));
    }

    @Override
    public ServiceRequestView cancel(UUID requestId, UUID actorId) {
        return transition(requestId, "REQUEST_CANCELLED", actorId,
                (request, now) -> request.cancel(now));
    }

    @Override
    public ServiceRequestView reopen(UUID requestId, UUID actorId) {
        return transition(requestId, "REQUEST_REOPENED", actorId,
                (request, now) -> request.reopen(now));
    }

    @Override
    public ServiceRequestView assign(UUID requestId, UUID assigneeId, UUID actorId) {
        ServiceRequest request = existing(requestId);
        ServiceRequest.Status before = request.getStatus();
        try {
            request.assignTo(assigneeId, Instant.now());
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw new ServiceRequestException(e.getMessage(), e);
        }
        record(request, "REQUEST_ASSIGNED", "{\"status\":\"" + before + "\"}",
                "{\"status\":\"" + request.getStatus() + "\"}", actorId);
        return ServiceRequestView.from(request);
    }

    @Override
    @Transactional(readOnly = true)
    public ServiceRequestView get(UUID requestId) {
        return ServiceRequestView.from(existing(requestId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceRequestView> listByScope(AuthorizedPropertyScope scope) {
        if (scope == null || scope.propertyIds() == null || scope.propertyIds().isEmpty()) {
            throw new ServiceRequestException("an explicit property scope is required");
        }
        return requests.findByPropertyIdIn(scope.propertyIds()).stream()
                .map(ServiceRequestView::from).toList();
    }

    private ServiceRequestView transition(UUID requestId, String action, UUID actorId,
            RequestTransition transition) {
        ServiceRequest request = existing(requestId);
        ServiceRequest.Status before = request.getStatus();
        try {
            transition.apply(request, Instant.now());
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw new ServiceRequestException(e.getMessage(), e);
        }
        record(request, action, "{\"status\":\"" + before + "\"}",
                "{\"status\":\"" + request.getStatus() + "\"}", actorId);
        return ServiceRequestView.from(request);
    }

    private ServiceRequest existing(UUID requestId) {
        if (requestId == null) {
            throw new ServiceRequestException("request id is required");
        }
        return requests.findById(requestId)
                .orElseThrow(() -> new ServiceRequestException("service request not found"));
    }

    private void record(ServiceRequest request, String action, String before, String after,
            UUID actorId) {
        ReservationAuditEvent.ActorType type = actorId == null
                ? ReservationAuditEvent.ActorType.SYSTEM
                : ReservationAuditEvent.ActorType.STAFF;
        audit.record(new AuditService.RecordAuditCommand(type, actorId, action,
                "SERVICE_REQUEST", request.getId(), request.getPropertyId(), before, after, null,
                null));
    }

    @FunctionalInterface
    private interface RequestTransition {
        void apply(ServiceRequest request, Instant now);
    }
}
