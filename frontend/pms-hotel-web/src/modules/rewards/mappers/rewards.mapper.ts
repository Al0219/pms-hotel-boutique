import { boolean, count, dateOnly, list, oneOf, text } from "@/lib/validation";
import type { RewardsProgramDTO } from "../dtos/rewards.dto";
import type { RewardsProgram } from "../model/rewards";

export function mapRewardsProgram(dto: RewardsProgramDTO): RewardsProgram {
  return { accountId: text(dto.account_id), currentTier: text(dto.current_tier), currentNights: count(dto.current_nights), targetNights: count(dto.target_nights), nextTier: text(dto.next_tier),
    pointsBalance: dto.points_balance == null ? null : count(dto.points_balance),
    benefits: list(dto.benefits).map(b => ({ id: text(b.id), title: text(b.title), description: text(b.description), isActive: boolean(b.is_active) })),
    ledger: dto.ledger == null ? null : list(dto.ledger).map(entry => ({ id: text(entry.id), type: oneOf(entry.type, ["EARN", "REDEEM", "EXPIRE", "REVERSE"]),
      points: count(entry.points), date: dateOnly(entry.date), description: text(entry.description), reservationId: entry.reservation_id == null ? null : text(entry.reservation_id) })),
  };
}
