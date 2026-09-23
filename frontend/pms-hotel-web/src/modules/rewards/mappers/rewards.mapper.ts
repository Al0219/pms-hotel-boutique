import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { RewardsProgramDTO } from "../dtos/rewards.dto";
import type { RewardsProgram } from "../model/rewards";

function requiredText(value: string | undefined | null, code: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new DomainMappingError(code);
  return normalized;
}

export function mapRewardsProgram(dto: RewardsProgramDTO): RewardsProgram {
  return {
    accountId: requiredText(dto.account_id, "INVALID_ACCOUNT_ID"),
    currentTier: requiredText(dto.current_tier, "INVALID_CURRENT_TIER"),
    currentNights: dto.current_nights ?? 0,
    targetNights: dto.target_nights ?? 8,
    nextTier: dto.next_tier || "Gold",
    benefits: (dto.benefits || []).map((b) => ({
      id: requiredText(b.id, "INVALID_BENEFIT_ID"),
      title: requiredText(b.title, "INVALID_BENEFIT_TITLE"),
      description: b.description || "",
      isActive: Boolean(b.is_active),
    })),
  };
}
