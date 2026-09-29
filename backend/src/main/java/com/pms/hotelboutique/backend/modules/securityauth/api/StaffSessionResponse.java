package com.pms.hotelboutique.backend.modules.securityauth.api;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public record StaffSessionResponse(UUID staffUserId, UUID sessionId, String username, String roleCode,
        Set<String> permissions, List<PropertyMembershipResponse> memberships) {
    public record PropertyMembershipResponse(UUID propertyId, String propertyCode, String name, String timezone, String currency) { }
}
