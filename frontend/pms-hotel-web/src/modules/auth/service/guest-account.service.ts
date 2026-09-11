import { httpRequest } from "@/lib/http/client";

import type { GuestAccountDTO } from "../dtos/guest-account.dto";

/** PROVISIONAL endpoint. Backend must confirm before production authentication. */
export function getGuestAccount(accountId: string, signal?: AbortSignal): Promise<GuestAccountDTO> {
  return httpRequest<GuestAccountDTO>({ path: `/guest-accounts/${encodeURIComponent(accountId)}`, signal });
}
