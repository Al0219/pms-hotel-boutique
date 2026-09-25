import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { boolean, dateOnly, text } from "@/lib/validation";
import type { PromotionDTO } from "../dtos/promotions.dto";
import type { Promotion } from "../model/promotions";

export function mapPromotion(dto: PromotionDTO): Promotion {
  const code = text(dto.code);
  if (!Number.isFinite(dto.discount_percentage) || dto.discount_percentage < 0 || dto.discount_percentage > 100) throw new DomainMappingError("INVALID_DISCOUNT");
  const validFrom = dto.valid_from == null ? null : dateOnly(dto.valid_from), validUntil = dto.valid_until == null ? null : dateOnly(dto.valid_until);
  if (validFrom && validUntil && validUntil < validFrom) throw new DomainMappingError("INVALID_PROMOTION_DATES");
  return { code, title: text(dto.title), discountPercentage: dto.discount_percentage, description: text(dto.description), isEligible: boolean(dto.is_eligible), conditions: text(dto.conditions),
    validFrom, validUntil, statusLabel: dto.status_label == null ? null : text(dto.status_label), eligibilityReason: dto.eligibility_reason == null ? null : text(dto.eligibility_reason),
    combinable: dto.combinable == null ? null : boolean(dto.combinable), combinationReason: dto.combination_reason == null ? null : text(dto.combination_reason) };
}
