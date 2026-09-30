import { HttpStatusError, httpRequest } from "@/lib/http";
import type { StaffIdentityDTO, StaffSessionDTO } from "../dtos/staff-session.dto";

function bffUrl(path: string): string {
  return new URL(path, window.location.origin).href;
}

export function getStaffIdentityDTO(signal?: AbortSignal): Promise<StaffIdentityDTO> {
  return httpRequest({ path: bffUrl("/__mock/private-09/session"), signal });
}

export function getStaffSessionDTO(signal?: AbortSignal): Promise<StaffSessionDTO> {
  return httpRequest({ path: bffUrl("/api/auth/staff/session"), signal });
}

export function refreshStaffSession(): Promise<{ refreshed: boolean }> {
  return httpRequest({ path: bffUrl("/api/auth/staff/refresh"), method: "POST" });
}

export async function getActiveStaffSessionDTO(signal?: AbortSignal): Promise<StaffSessionDTO> {
  try { return await getStaffSessionDTO(signal); }
  catch (error) {
    if (!(error instanceof HttpStatusError) || error.status !== 401) throw error;
    await refreshStaffSession();
    return getStaffSessionDTO(signal);
  }
}

export function logoutStaffSession(): Promise<void> {
  return httpRequest<void>({ path: bffUrl("/api/auth/staff/session"), method: "DELETE" });
}
