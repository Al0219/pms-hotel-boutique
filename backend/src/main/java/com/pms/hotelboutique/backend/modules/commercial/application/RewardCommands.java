package com.pms.hotelboutique.backend.modules.commercial.application;

import com.pms.hotelboutique.backend.modules.commercial.domain.RewardLedgerEntry;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

/** Inputs and read models for the reward ledger. No REST contract is implied. */
public final class RewardCommands {

    private RewardCommands() {
    }

    public record EarnRewardCommand(
            @NotNull UUID guestProfileId,
            @NotNull UUID propertyId,
            @Positive long points,
            @NotNull UUID stayId,
            @NotBlank @Size(max = 255) String reason) {
    }

    public record SpendRewardCommand(
            @NotNull UUID guestProfileId,
            @NotNull UUID propertyId,
            @Positive long points,
            @NotBlank @Size(max = 255) String reason) {
    }

    public record ReverseRewardCommand(
            @NotNull UUID guestProfileId,
            @NotNull UUID originalEntryId,
            @NotBlank @Size(max = 255) String reason) {
    }

    public record RewardEntryView(
            UUID id,
            UUID guestProfileId,
            UUID propertyId,
            RewardLedgerEntry.Kind kind,
            long points,
            UUID stayId,
            UUID reversesId,
            String reason,
            UUID createdBy,
            Instant createdAt) {

        public static RewardEntryView from(RewardLedgerEntry entry) {
            return new RewardEntryView(
                    entry.getId(), entry.getGuestProfileId(), entry.getPropertyId(),
                    entry.getKind(), entry.getPoints(), entry.getStayId(), entry.getReversesId(),
                    entry.getReason(), entry.getCreatedBy(), entry.getCreatedAt());
        }
    }
}
