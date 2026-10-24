import type { StaffRole } from '../model/staff-admin';
export interface StaffAdminCreateDTO {
  username: string;
  workEmail: string;
  roleCode: Exclude<StaffRole, 'SUPER_ADMIN'>;
  propertyIds: string[];
}
