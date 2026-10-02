package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.securityauth.application.AuthorizedPropertyScope;
import com.pms.hotelboutique.backend.modules.securityauth.application.StaffAuthorizationSnapshot;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

/**
 * BD3 reward ledger operations (F14 base).
 *
 * <p>Ledger is append-only ({@code EARN}/{@code REDEEM}/{@code EXPIRE}/
 * {@code REVERSE}); balance is derived, never stored. {@code EARN} posts
 * exactly once per {@code CHECKED_OUT} stay of a non-cancelled reservation;
 * {@code CANCELLED}/{@code NO_SHOW} stays never earn. Temporary
 * authorization: SUPER_ADMIN only
 * ({@code TODO(BD1): alta B2B_MANAGE}). No REST contract is implied.
 * Redemption against folios belongs to a later phase.</p>
 */
public interface RewardService {

    RewardCommands.RewardEntryView earn(StaffAuthorizationSnapshot authorization,
            @Valid RewardCommands.EarnRewardCommand command, UUID actorId);

    RewardCommands.RewardEntryView redeem(StaffAuthorizationSnapshot authorization,
            @Valid RewardCommands.SpendRewardCommand command, UUID actorId);

    RewardCommands.RewardEntryView expire(StaffAuthorizationSnapshot authorization,
            @Valid RewardCommands.SpendRewardCommand command, UUID actorId);

    RewardCommands.RewardEntryView reverse(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, @Valid RewardCommands.ReverseRewardCommand command,
            UUID actorId);

    long balanceOf(StaffAuthorizationSnapshot authorization, AuthorizedPropertyScope scope,
            UUID guestProfileId);

    List<RewardCommands.RewardEntryView> historyOf(StaffAuthorizationSnapshot authorization,
            AuthorizedPropertyScope scope, UUID guestProfileId);
}
