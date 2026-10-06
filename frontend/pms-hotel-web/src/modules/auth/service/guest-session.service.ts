import { HttpStatusError, httpRequest } from "@/lib/http";
import type { GuestSessionDTO } from "../dtos/guest-session.dto";

function sessionUrl(): string {
  return new URL("/api/auth/guest/session", window.location.origin).href;
}

export async function getGuestSessionDTO(signal?: AbortSignal): Promise<GuestSessionDTO | null> {
  try {
    return await httpRequest<GuestSessionDTO>({ path: sessionUrl(), signal, withAuth: false });
  } catch (error) {
    if (error instanceof HttpStatusError && error.status === 401) return null;
    throw error;
  }
}

export function logoutGuestSession(): Promise<void> {
  return httpRequest<void>({ path: sessionUrl(), method: "DELETE", withAuth: false });
}
