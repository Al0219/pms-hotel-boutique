package com.pms.hotelboutique.backend.modules.inventory.application;

import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationService;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffPrincipal;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** Resolves live membership and permissions, never authorization claims from JWT. */
@Component
public class PropertyAccess {
    private final StaffAuthService sessions;
    private final StaffAuthorizationService authorization;

    public PropertyAccess(StaffAuthService sessions, StaffAuthorizationService authorization) {
        this.sessions = sessions;
        this.authorization = authorization;
    }

    public boolean isStaff(Authentication authentication) {
        return authentication != null && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof StaffPrincipal;
    }

    public boolean canCreate(Authentication authentication) {
        if (!isStaff(authentication)) { return false; }
        var snapshot = resolve(authentication).snapshot();
        return "SUPER_ADMIN".equals(snapshot.roleCode()) && snapshot.hasPermission("STAFF_MANAGE");
    }

    public boolean canList(Authentication authentication) {
        return isStaff(authentication) && resolve(authentication).snapshot().hasPermission("MULTI_PROPERTY_READ");
    }

    public boolean canUpdate(Authentication authentication) {
        return isStaff(authentication) && resolve(authentication).snapshot().hasPermission("COMMERCIAL_MANAGE");
    }

    public Context current() { return resolve(SecurityContextHolder.getContext().getAuthentication()); }

    private Context resolve(Authentication authentication) {
        if (!isStaff(authentication)) { throw new AccessDeniedException("Active Staff session required"); }
        var principal = sessions.getActivePrincipal((StaffPrincipal) authentication.getPrincipal());
        return new Context(principal, authorization.resolve(principal.staffUserId()));
    }

    public record Context(StaffPrincipal principal, StaffAuthorizationSnapshot snapshot) { }
}
