import type { GuestReservationListDTO } from "../dtos/guest-reservation.dto";
import { getPublicEnvironment } from "@/lib/env";
import { httpRequest } from "@/lib/http/client";

import type { AccountSummaryDTO, MockAccountSummaryDTO } from "../dtos/account.dto";

/** Confirmed own-account summary; Browser never supplies an account id or Bearer. */
export function getAccountSummary(signal?: AbortSignal): Promise<AccountSummaryDTO> {
  return httpRequest<AccountSummaryDTO>({ path: new URL("/api/auth/guest/account/summary", window.location.origin).href,
    signal, withAuth: false });
}

/** PROVISIONAL endpoint used exclusively by mock fixtures. */
export function getMockAccountSummary(accountId: string, signal?: AbortSignal): Promise<MockAccountSummaryDTO> {
  if (!getPublicEnvironment().useMockApi) throw new Error("MOCK_ACCOUNT_SUMMARY_DISABLED");
  return httpRequest<MockAccountSummaryDTO>({ baseUrl: "http://pms.test", path: `/account/summary?accountId=${encodeURIComponent(accountId)}`, signal });
}

/** PROVISIONAL endpoint for guest stay history */
export function getStayHistory(accountId: string, signal?: AbortSignal): Promise<GuestReservationListDTO> {
  return httpRequest<GuestReservationListDTO>({ baseUrl: getPublicEnvironment().useMockApi ? "http://pms.test" : undefined, path: `/account/history?accountId=${encodeURIComponent(accountId)}`, signal });
}
