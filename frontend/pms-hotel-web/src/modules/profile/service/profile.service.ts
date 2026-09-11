import { httpRequest } from "@/lib/http/client";

import type { GuestProfileDTO } from "../dtos/profile.dto";

/** PROVISIONAL endpoint for fetching guest profile */
export function getGuestProfile(profileId: string, signal?: AbortSignal): Promise<GuestProfileDTO> {
  return httpRequest<GuestProfileDTO>({ path: `/profile/${encodeURIComponent(profileId)}`, signal });
}

/** PROVISIONAL endpoint for updating guest profile */
export function updateGuestProfile(profile: Partial<GuestProfileDTO>, signal?: AbortSignal): Promise<GuestProfileDTO> {
  return httpRequest<GuestProfileDTO>({
    path: `/profile/update`,
    method: "POST",
    body: JSON.stringify(profile),
    signal,
  });
}
