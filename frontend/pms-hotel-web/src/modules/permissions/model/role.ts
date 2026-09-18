/** Local presentation data; these identifiers do not enforce backend authorization. */
export interface RolePreview {
  id: string;
  name: string;
  users: number;
  description?: string;
  properties?: readonly string[];
  permissions?: readonly string[];
}
