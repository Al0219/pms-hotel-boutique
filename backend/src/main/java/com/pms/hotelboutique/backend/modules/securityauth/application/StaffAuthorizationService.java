package com.pms.hotelboutique.backend.modules.securityauth.application;

import com.pms.hotelboutique.backend.modules.securityauth.infrastructure.persistence.StaffAuthorizationRepository;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class StaffAuthorizationService {
    private final StaffAuthorizationRepository repository;
    public StaffAuthorizationService(StaffAuthorizationRepository repository) { this.repository = repository; }

    public StaffAuthorizationSnapshot resolve(UUID staffUserId) {
        StaffAuthorizationRepository.Membership membership = repository.findActiveMembership(staffUserId)
                .orElseThrow(StaffAuthenticationException::new);
        boolean superAdmin = "SUPER_ADMIN".equals(membership.roleCode());
        Set<String> permissions = repository.findPermissions(membership.roleCode());
        var properties = repository.findActiveProperties(staffUserId, membership.organizationId(), superAdmin);
        if (!superAdmin && properties.isEmpty()) throw new StaffAuthenticationException();
        return new StaffAuthorizationSnapshot(membership.organizationId(), membership.roleCode(), permissions, properties);
    }

    public boolean canManageAllProperties(StaffAuthorizationSnapshot snapshot) {
        return "SUPER_ADMIN".equals(snapshot.roleCode()) || snapshot.hasPermission("MULTI_PROPERTY_READ");
    }
}
