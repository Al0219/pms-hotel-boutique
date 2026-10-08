package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * BD3 promotion operations (F14 base).
 *
 * <p>Catalog lifecycle plus deterministic stacking: winners ordered by
 * priority (higher first, code as tie-break); every loser is reported with
 * reason, priority and conflict. Applying benefits to a folio belongs to a
 * later phase. Authorization requires the effective {@code COMMERCIAL_MANAGE} permission
 * and an explicit authorized property context. No REST contract is implied.</p>
 */
public interface PromotionService {

    PromotionView create(StaffAuthorizationSnapshot authorization,
            @Valid CreatePromotionCommand command, UUID actorId);

    PromotionView update(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID promotionId, @Valid UpdatePromotionCommand command, UUID actorId);

    PromotionView activate(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID promotionId, UUID actorId);

    PromotionView pause(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID promotionId, UUID actorId);

    PromotionView expire(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID promotionId, UUID actorId);

    PromotionView get(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID promotionId);

    List<PromotionView> list(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope);

    StackView resolveStack(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            @NotNull LocalDate date, List<UUID> promotionIds);

    record StackView(List<PromotionView> winners, List<RejectedPromotion> rejected) {
    }

    record RejectedPromotion(UUID promotionId, String code, String reason, int priority,
            String conflict) {
    }
}
