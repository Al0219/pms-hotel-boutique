import { httpRequest } from "@/lib/http/client";

import type { AccountSummaryDTO, StayHistoryItemDTO } from "../dtos/account.dto";

/** PROVISIONAL endpoint for account summary data */
export function getAccountSummary(accountId: string, signal?: AbortSignal): Promise<AccountSummaryDTO> {
  return httpRequest<AccountSummaryDTO>({ path: `/account/summary?accountId=${encodeURIComponent(accountId)}`, signal });
}

/** PROVISIONAL endpoint for guest stay history */
export function getStayHistory(accountId: string, signal?: AbortSignal): Promise<StayHistoryItemDTO[]> {
  return httpRequest<StayHistoryItemDTO[]>({ path: `/account/history?accountId=${encodeURIComponent(accountId)}`, signal });
}
