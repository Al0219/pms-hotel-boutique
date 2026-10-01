package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest;
import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * BD3 service request operations (Fase 10).
 *
 * No REST contract is implied. Reads take an explicit
 * {@code AuthorizedPropertyScope} (C2).
 */
public interface ServiceRequestService {

    ServiceRequestView openRequest(@Valid OpenRequestCommand command);

    ServiceRequestView startProgress(UUID requestId, UUID actorId);

    ServiceRequestView complete(UUID requestId, UUID actorId);

    ServiceRequestView cancel(UUID requestId, UUID actorId);

    ServiceRequestView reopen(UUID requestId, UUID actorId);

    ServiceRequestView assign(UUID requestId, UUID assigneeId, UUID actorId);

    ServiceRequestView get(UUID requestId);

    List<ServiceRequestView> listByScope(AuthorizedPropertyScope scope);

    record OpenRequestCommand(
            @NotNull UUID propertyId,
            @NotNull ServiceRequest.Category category,
            @NotBlank @Size(max = 160) String subject,
            String detail,
            ServiceRequest.Priority priority,
            UUID reservationId,
            UUID stayId,
            UUID roomId,
            UUID guestProfileId,
            UUID reportedBy,
            Instant dueAt) {
    }

    record ServiceRequestView(UUID id, UUID propertyId, ServiceRequest.Category category,
            UUID reservationId, UUID stayId, UUID roomId, UUID guestProfileId, String subject,
            String detail, ServiceRequest.Priority priority, ServiceRequest.Status status,
            UUID createdBy, UUID assignedTo, Instant dueAt, Instant completedAt, Instant createdAt,
            Instant updatedAt) {

        static ServiceRequestView from(ServiceRequest request) {
            return new ServiceRequestView(request.getId(), request.getPropertyId(),
                    request.getCategory(), request.getReservationId(), request.getStayId(),
                    request.getRoomId(), request.getGuestProfileId(), request.getSubject(),
                    request.getDetail(), request.getPriority(), request.getStatus(),
                    request.getCreatedBy(), request.getAssignedTo(), request.getDueAt(),
                    request.getCompletedAt(), request.getCreatedAt(), request.getUpdatedAt());
        }
    }
}
