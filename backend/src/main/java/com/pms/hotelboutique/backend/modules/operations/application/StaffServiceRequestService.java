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
}
