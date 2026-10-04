package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import org.springframework.security.access.AccessDeniedException;

/** Permission check for internal commercial services; scope is still required separately. */
final class CommercialAuthorization {
    private CommercialAuthorization() { }

    static void requireManage(StaffAuthorizationSnapshot authorization) {
        if (authorization == null || authorization.permissions() == null
                || !authorization.hasPermission("COMMERCIAL_MANAGE")) {
            throw new AccessDeniedException("Commercial operations require COMMERCIAL_MANAGE");
        }
    }
}
