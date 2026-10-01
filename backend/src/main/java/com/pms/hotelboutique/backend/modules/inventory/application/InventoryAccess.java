package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.securityauth.application.PropertyScopeResolver;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/** Method-security evaluator using live BD1 authorization, never JWT permission claims. */
@Component
public class InventoryAccess {
    private final StaffAuthService sessions;
    private final StaffAuthorizationService authorization;
    private final PropertyScopeResolver scopes;

    public InventoryAccess(StaffAuthService sessions, StaffAuthorizationService authorization,
            PropertyScopeResolver scopes) {
        this.sessions = sessions;
        this.authorization = authorization;
        this.scopes = scopes;
    }

    public boolean canRead(Authentication authentication, UUID propertyId) {
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof StaffPrincipal principal)) {
            return false;
        }
        var active = sessions.getActivePrincipal(principal);
        var snapshot = authorization.resolve(active.staffUserId());
        if (!snapshot.hasPermission("RESERVATION_MANAGE") && !snapshot.hasPermission("COMMERCIAL_MANAGE")) {
            return false;
        }
        scopes.resolveProperty(snapshot, propertyId);
        return true;
    }
}
