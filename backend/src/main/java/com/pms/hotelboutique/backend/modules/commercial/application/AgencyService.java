package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

/**
 * BD3 B2B agency operations (F12 base).
 *
 * <p>Temporary authorization: SUPER_ADMIN only until BD1 owns a dedicated
 * B2B permission ({@code TODO(BD1): alta B2B_MANAGE}). No delete is offered;
 * agencies are deactivated to preserve history. Commission model is a label
 * only; commission math belongs to a later phase and never reduces the
 * guest price.</p>
 */
public interface AgencyService {

    AgencyView create(StaffAuthorizationSnapshot authorization,
            @Valid CreateAgencyCommand command, UUID actorId);

    AgencyView update(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID agencyId, @Valid UpdateAgencyCommand command, UUID actorId);

    AgencyView activate(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID agencyId, UUID actorId);

    AgencyView deactivate(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID agencyId, UUID actorId);

    AgencyView get(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID agencyId);

    List<AgencyView> list(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope);
}
