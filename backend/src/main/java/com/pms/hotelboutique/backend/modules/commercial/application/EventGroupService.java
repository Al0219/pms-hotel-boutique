package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

/**
 * BD3 group/event operations (F13 base).
 *
 * <p>Authorization requires the effective {@code COMMERCIAL_MANAGE} permission
 * and an explicit authorized property context. Lifecycle advances exactly
 * one step per call; no delete is offered. No REST contract is
 * implied. Cutoff auto-release and billing belong to later phases.</p>
 */
public interface EventGroupService {

    EventGroupView create(StaffAuthorizationSnapshot authorization,
            @Valid CreateEventGroupCommand command, UUID actorId);

    EventGroupView update(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID groupId, @Valid UpdateEventGroupCommand command, UUID actorId);

    EventGroupView advance(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID groupId, UUID actorId);

    EventGroupView get(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID groupId);

    List<EventGroupView> list(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope);
}
