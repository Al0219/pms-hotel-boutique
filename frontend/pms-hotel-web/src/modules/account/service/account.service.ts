import type { GuestReservationListDTO } from "../dtos/guest-reservation.dto";
import { getPublicEnvironment } from "@/lib/env";
import { httpRequest } from "@/lib/http/client";

import type { AccountSummaryDTO } from "../dtos/account.dto";

/** PROVISIONAL endpoint for account summary data */
export function getAccountSummary(accountId: string, signal?: AbortSignal): Promise<AccountSummaryDTO> {
  return httpRequest<AccountSummaryDTO>({ baseUrl: getPublicEnvironment().useMockApi ? "http://pms.test" : undefined, path: `/account/summary?accountId=${encodeURIComponent(accountId)}`, signal });
}

/** PROVISIONAL endpoint for guest stay history */
export function getStayHistory(accountId: string, signal?: AbortSignal): Promise<GuestReservationListDTO> {
  return httpRequest<GuestReservationListDTO>({ baseUrl: getPublicEnvironment().useMockApi ? "http://pms.test" : undefined, path: `/account/history?accountId=${encodeURIComponent(accountId)}`, signal });
}
