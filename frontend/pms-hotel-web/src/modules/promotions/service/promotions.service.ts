import { httpRequest } from "@/lib/http/client";

import type { PromotionDTO } from "../dtos/promotions.dto";

/** PROVISIONAL endpoint for fetching promotions */
export function getPromotions(accountId: string, signal?: AbortSignal): Promise<PromotionDTO[]> {
  return httpRequest<PromotionDTO[]>({ path: `/promotions?accountId=${encodeURIComponent(accountId)}`, signal });
}
