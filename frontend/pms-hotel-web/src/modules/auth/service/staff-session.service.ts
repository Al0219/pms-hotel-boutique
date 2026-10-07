import { HttpStatusError, httpRequest } from "@/lib/http";
import type { StaffIdentityDTO, StaffSessionDTO } from "../dtos/staff-session.dto";

function bffUrl(path: string): string {
  return new URL(path, window.location.origin).href;
}

export function getStaffIdentityDTO(signal?: AbortSignal): Promise<StaffIdentityDTO> {
  return httpRequest({ path: bffUrl("/__mock/private-09/session"), signal });
}

export function getStaffSessionDTO(signal?: AbortSignal): Promise<StaffSessionDTO> {
  return httpRequest({ path: bffUrl("/api/auth/staff/session"), signal, withAuth: false });
}

export function refreshStaffSession(): Promise<{ refreshed: boolean }> {
  return httpRequest({ path: bffUrl("/api/auth/staff/refresh"), method: "POST", withAuth: false });
}

// One cookie rotation shared by concurrent Staff restorations; never shared with Guest.
let refreshInFlight: Promise<{ refreshed: boolean }> | undefined;
function restoreStaffSession() {
  refreshInFlight ??= refreshStaffSession().finally(() => { refreshInFlight = undefined; });
  return refreshInFlight;
}

export async function getActiveStaffSessionDTO(signal?: AbortSignal): Promise<StaffSessionDTO> {
  try { return await getStaffSessionDTO(signal); }
  catch (error) {
    if (signal?.aborted || !(error instanceof HttpStatusError) || error.status !== 401) throw error;
    await restoreStaffSession();
    // Deliberately outside the catch: a second 401 terminates restoration.
    return getStaffSessionDTO(signal);
  }
}

export function logoutStaffSession(): Promise<void> {
  return httpRequest<void>({ path: bffUrl("/api/auth/staff/session"), method: "DELETE", withAuth: false });
}
