import { mockRequest } from "@/lib/http/mock-request";
import type { RolesDTO } from "../dtos/roles.dto";
type ActionDTO = ({ type: "save" } & RolesDTO) | { type: "reset" };
export function getRolesDTO(signal?: AbortSignal): Promise<RolesDTO> { return mockRequest("roles", undefined, signal); }
export function updateRolesDTO(action: ActionDTO): Promise<RolesDTO> {
  return mockRequest("roles", action);
}
