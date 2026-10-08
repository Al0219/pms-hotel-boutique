import { mockRequest } from "@/lib/http/mock-request";
import type { SecurityDTO } from "../dtos/security.dto";
import type { SecurityAction } from "../model/security";
export type Action = SecurityAction;
export function getSecurityDTO(signal?: AbortSignal): Promise<SecurityDTO> { return mockRequest("security", undefined, signal); }
export function updateSecurityDTO(action: Action): Promise<SecurityDTO> {
  return mockRequest("security", action);
}

