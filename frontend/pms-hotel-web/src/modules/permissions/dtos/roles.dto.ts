/** Approved frontend/mock contract: docs/32_PRIVATE_07_MOCK_CONTRACT_PROPOSAL.md. Not a Backend API. */
export interface RoleDTO {
  role_id: string; name: string; user_count: number; description: string | null;
  property_ids: string[]; permission_ids: string[]; configured: boolean;
}
export interface RolesDTO { roles: RoleDTO[] }

