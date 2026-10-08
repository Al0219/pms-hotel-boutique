/** Local presentation data; these identifiers do not enforce Backend authorization. */
export interface RolePreview {
  id: string; name: string; users: number; description: string | null;
  properties: string[]; permissions: string[]; configured: boolean;
}
