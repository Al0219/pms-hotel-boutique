package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import io.swagger.v3.oas.annotations.media.Schema;
import com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Staff-only entry for the AD-03 intake/read and scoped Housekeeping operations. */
public interface StaffServiceRequestService {
    ServiceRequestService.ServiceRequestView open(StaffPrincipal principal,
            ServiceRequestService.OpenRequestCommand command);

    ServiceRequestService.ServiceRequestView get(StaffPrincipal principal, UUID propertyId, UUID requestId);

    List<ServiceRequestService.ServiceRequestView> list(StaffPrincipal principal, UUID propertyId);
    List<HousekeepingRequestView> listHousekeeping(StaffPrincipal principal, UUID propertyId);

    TransitionResult transitionHousekeeping(StaffPrincipal principal, UUID propertyId, UUID requestId,
            Instant expectedUpdatedAt, ServiceRequest.Status targetStatus);
    @Schema(name = "StaffHousekeepingTransitionResult")
    record TransitionResult(UUID id, UUID propertyId,
            ServiceRequest.Status status, Instant updatedAt) { }

    record HousekeepingRequestView(UUID id, UUID propertyId, String confirmationCode, @Schema(nullable = true) String roomCode,
            LocalDate serviceDate, String timeSlot, String cleaningType,
            @Schema(nullable = true, maxLength = 500) String notes, ServiceRequest.Status status, Instant updatedAt) { }
}
