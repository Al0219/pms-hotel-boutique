import { mockRequest } from "@/lib/http/mock-request";
import type { PrivacyDTO } from "../dtos/privacy.dto";
import type { PrivacyAction } from "../model/privacy";
export type Action = PrivacyAction;
export function getPrivacyDTO(signal?: AbortSignal): Promise<PrivacyDTO> { return mockRequest("privacy", undefined, signal); }
export function updatePrivacyDTO(action: Action): Promise<PrivacyDTO> {
  return mockRequest("privacy", action);
}

