import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import type { PromotionDTO } from "../dtos/promotions.dto";
import type { Promotion } from "../model/promotions";

function requiredText(value: string | undefined | null, code: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new DomainMappingError(code);
  return normalized;
}

export function mapPromotion(dto: PromotionDTO): Promotion {
  return {
    code: requiredText(dto.code, "INVALID_PROMOTION_CODE"),
    title: requiredText(dto.title, "INVALID_PROMOTION_TITLE"),
    discountPercentage: dto.discount_percentage ?? 0,
    description: dto.description || "",
    isEligible: Boolean(dto.is_eligible),
    conditions: dto.conditions || "",
  };
}
