import { httpRequest } from "@/lib/http/client";
import { getPublicEnvironment } from "@/lib/env";
import type { GuestProfileDTO } from "../dtos/profile.dto";

/** Provisional Guest read/update transport; account-to-profile binding is explicit. */
export function getGuestProfile(profileId: string, accountId: string, signal?: AbortSignal): Promise<GuestProfileDTO> {
  return httpRequest({ path: `/profile/${encodeURIComponent(profileId)}?accountId=${encodeURIComponent(accountId)}`, baseUrl: getPublicEnvironment().useMockApi ? "http://pms.test" : undefined, signal });
}
export function updateGuestProfile(profile: GuestProfileDTO, accountId: string, signal?: AbortSignal): Promise<GuestProfileDTO> {
  return httpRequest({ path: `/profile/update?accountId=${encodeURIComponent(accountId)}`, baseUrl: getPublicEnvironment().useMockApi ? "http://pms.test" : undefined,
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(profile), signal });
}
