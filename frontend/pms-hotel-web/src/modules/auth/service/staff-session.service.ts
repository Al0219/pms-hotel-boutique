import { httpRequest } from "@/lib/http";
import type { StaffIdentityDTO } from "../dtos/staff-session.dto";

export function getStaffIdentityDTO(signal?: AbortSignal): Promise<StaffIdentityDTO> {
  return httpRequest({ path: new URL("/__mock/private-09/session", window.location.origin).href, signal });
}
