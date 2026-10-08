import { getPublicEnvironment } from "@/lib/env";
import { httpRequest } from "@/lib/http/client";
import type { GuestAccountDTO } from "../dtos/guest-account.dto";
import type { GuestAccessInput } from "../model/guest-access";

/** Frontend-only MSW transport. Not a Backend authentication API or Google callback. */
export function simulateGuestAccess(input: GuestAccessInput, signal: AbortSignal): Promise<GuestAccountDTO> {
  if (!getPublicEnvironment().useMockApi) return Promise.reject(new Error("GUEST_MOCK_ACCESS_DISABLED"));
  return httpRequest<GuestAccountDTO>({
    path: "http://pms.test/__mock/guest-access",
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
}
