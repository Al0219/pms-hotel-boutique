package com.pms.hotelboutique.backend.modules.operations.application;

import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import java.util.List;
import java.util.UUID;

/** Staff-only entry for the AD-03 intake and read capability. */
public interface StaffServiceRequestService {
    ServiceRequestService.ServiceRequestView open(StaffPrincipal principal,
            ServiceRequestService.OpenRequestCommand command);

    ServiceRequestService.ServiceRequestView get(StaffPrincipal principal, UUID propertyId, UUID requestId);

    List<ServiceRequestService.ServiceRequestView> list(StaffPrincipal principal, UUID propertyId);
    List<HousekeepingRequestView> listHousekeeping(StaffPrincipal principal, UUID propertyId);

    record HousekeepingRequestView(UUID id, UUID propertyId, String confirmationCode, @io.swagger.v3.oas.annotations.media.Schema(nullable = true) String roomCode,
            java.time.LocalDate serviceDate, String timeSlot, String cleaningType,
            @io.swagger.v3.oas.annotations.media.Schema(nullable = true, maxLength = 500) String notes, com.pms.hotelboutique.backend.modules.operations.domain.ServiceRequest.Status status) { }
}
