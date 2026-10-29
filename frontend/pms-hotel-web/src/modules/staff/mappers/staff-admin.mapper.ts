import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
import type { PropertyScope } from '@/modules/properties';
import { staffAdminRoleCodes, staffAdminStatuses } from '../dtos/staff-admin.dto';
import type { StaffAdminContext, StaffAdminPage, StaffAdminUser } from '../model/staff-admin';

export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class StaffAdminContextMismatch extends DomainMappingError {
  constructor() { super('STAFF_ADMIN_CONTEXT_CHANGED'); }
}
function check(value: unknown): asserts value { if (!value) throw new DomainMappingError('INVALID_STAFF_ADMIN_RESPONSE'); }
function object(value: unknown): Record<string, unknown> { check(value && typeof value === 'object' && !Array.isArray(value)); return value as Record<string, unknown>; }
function ids(value: unknown): string[] {
  check(Array.isArray(value) && value.every(id => typeof id === 'string' && uuid.test(id)) && new Set(value).size === value.length);
  return [...value];
}
function same(a: readonly string[], b: readonly string[]) { return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort()); }
export function mapStaffAdminContext(value: unknown): StaffAdminContext {
  const data = object(value); check(typeof data.organizationId === 'string' && uuid.test(data.organizationId));
  check(Array.isArray(data.items) && data.items.length === staffAdminRoleCodes.length);
  const roles = data.items.map((item, index) => {
    const role = object(item); check(role.code === staffAdminRoleCodes[index] && typeof role.name === 'string' && role.name.length > 0);
    return { code: staffAdminRoleCodes[index], name: role.name as string };
  });
  return { organizationId: data.organizationId as string, roles };
}
interface ReadContext { organizationId: string; scope: PropertyScope; authorizedPropertyIds: readonly string[]; role: string }
function envelope(value: unknown, context: ReadContext) {
  const data = object(value), scope = object(data.scope);
  if (data.organizationId !== context.organizationId || scope.kind !== context.scope.kind || !same(ids(scope.propertyIds), context.scope.propertyIds)) throw new StaffAdminContextMismatch();
  return data;
}
function user(value: unknown, context: ReadContext): StaffAdminUser {
  const data = object(value), propertyIds = ids(data.propertyIds);
  check(typeof data.id === 'string' && uuid.test(data.id) && typeof data.username === 'string' && data.username.length > 0 && typeof data.workEmail === 'string');
  check(staffAdminRoleCodes.includes(data.roleCode as never) && staffAdminStatuses.includes(data.status as never));
  check(data.membershipStatus === 'ACTIVE' || data.membershipStatus === 'INACTIVE');
  if (data.organizationId !== context.organizationId || propertyIds.some(id => !context.authorizedPropertyIds.includes(id))) throw new StaffAdminContextMismatch();
  check(context.scope.kind !== 'PROPERTY' || propertyIds.includes(context.scope.propertyIds[0]));
  check(context.role !== 'GERENCIA' || (data.roleCode !== 'SUPER_ADMIN' && propertyIds.length > 0));
  check(propertyIds.length > 0 || (context.role === 'SUPER_ADMIN' && context.scope.kind === 'ALL_PROPERTIES'));
  for (const date of [data.createdAt, data.updatedAt]) check(typeof date === 'string' && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(date) && Number.isFinite(Date.parse(date)));
  check(Number.isSafeInteger(data.version) && (data.version as number) >= 0);
  return { id: data.id as string, username: data.username as string, workEmail: data.workEmail as string,
    roleCode: data.roleCode as StaffAdminUser['roleCode'], status: data.status as StaffAdminUser['status'],
    membershipStatus: data.membershipStatus, organizationId: context.organizationId, propertyIds,
    createdAt: data.createdAt as string, updatedAt: data.updatedAt as string, version: data.version as number };
}
export function mapStaffAdminPage(value: unknown, context: ReadContext, limit: number): StaffAdminPage {
  const data = envelope(value, context);
  check(data.limit === limit && Array.isArray(data.items) && data.items.length <= limit);
  check(data.nextCursor === null || (typeof data.nextCursor === 'string' && data.nextCursor.length > 0 && data.nextCursor.length <= 4096 && data.items.length === limit));
  const users = (data.items as unknown[]).map(item => user(item, context));
  check(new Set(users.map(item => item.id)).size === users.length);
  return { users, nextCursor: data.nextCursor as string | null };
}
export function mapStaffAdminDetail(value: unknown, context: ReadContext, id: string): StaffAdminUser {
  const item = user(envelope(value, context).item, context); check(item.id === id); return item;
}
