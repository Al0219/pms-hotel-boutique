package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

/**
 * BD3 B2B company operations (F12 base).
 *
 * <p>Authorization requires the effective {@code COMMERCIAL_MANAGE} permission
 * and an explicit authorized property context. No delete is offered;
 * companies are deactivated to preserve history. No REST contract is implied.
 * Credit, negotiated rates and direct-bill belong to later phases.</p>
 */
public interface CompanyService {

    CompanyView create(StaffAuthorizationSnapshot authorization,
            @Valid CreateCompanyCommand command, UUID actorId);

    CompanyView update(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID companyId, @Valid UpdateCompanyCommand command, UUID actorId);

    CompanyView activate(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID companyId, UUID actorId);

    CompanyView deactivate(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID companyId, UUID actorId);

    CompanyView get(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID companyId);

    List<CompanyView> list(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope);
}
