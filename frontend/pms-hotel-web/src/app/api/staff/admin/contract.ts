import { Buffer } from 'node:buffer';
import { staffAdminRoleCodes, staffAdminStatuses, type StaffAdminDetailDTO, type StaffAdminPageDTO,
  type StaffAdminRolesDTO, type StaffAdminScopeDTO, type StaffAdminUserDTO } from './staff-admin.dto';

export type StaffAdminResource = 'roles' | 'users' | 'detail';
type StaffAdminQueryResource = StaffAdminResource | 'create';
export interface StaffAdminQuery {
  params: URLSearchParams;
  scope?: 'PROPERTY' | 'ALL_PROPERTIES';
  propertyId?: string;
  status?: typeof staffAdminStatuses[number];
  roleCode?: typeof staffAdminRoleCodes[number];
  limit: number;
  id?: string;
}
const uuidPattern = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const fail = (): never => { throw new Error('INVALID_STAFF_ADMIN_TRANSPORT'); };
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) return fail();
  return value; // Validate without modifying persisted identifiers or contact information.
}
function uuid(value: unknown): string {
  if (typeof value !== 'string' || !uuidPattern.test(value)) return fail();
  return value.toLowerCase();
}
function choice<const T extends readonly string[]>(value: unknown, choices: T): T[number] {
  if (typeof value !== 'string' || !choices.includes(value)) return fail();
  return value as T[number];
}
function array(value: unknown): unknown[] { if (!Array.isArray(value)) return fail(); return value; }
function propertyIds(value: unknown): string[] {
  const ids = array(value).map(uuid);
  if (ids.some((id, i) => i > 0 && ids[i - 1] >= id)) return fail();
  return ids;
}
function javaWhitespace(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 9 && code <= 13) || (code >= 28 && code <= 32) || code === 0x1680
    || (code >= 0x2000 && code <= 0x2006) || (code >= 0x2008 && code <= 0x200a)
    || [0x2028, 0x2029, 0x205f, 0x3000].includes(code);
}
function cursor(value: unknown): string {
  if (typeof value !== 'string' || value.length > 4096 || [...value].every(javaWhitespace)) return fail();
  return value; // Opaque: never decode, sign, trim or rebuild a Backend cursor.
}

export function parseStaffAdminQuery(params: URLSearchParams, resource: StaffAdminQueryResource, id?: string): StaffAdminQuery {
  const allowed = resource === 'roles' ? [] : (resource === 'detail' || resource === 'create') ? ['scope', 'propertyId']
    : ['scope', 'propertyId', 'status', 'roleCode', 'username', 'limit', 'cursor'];
  for (const key of params.keys()) if (!allowed.includes(key) || params.getAll(key).length !== 1) fail();
  const result: StaffAdminQuery = { params: new URLSearchParams(params), limit: 50 };
  if (resource === 'roles') return result;
  result.scope = choice(params.get('scope'), ['PROPERTY', 'ALL_PROPERTIES']);
  if ((result.scope === 'PROPERTY') !== params.has('propertyId')) fail();
  if (result.scope === 'PROPERTY') {
    result.propertyId = uuid(params.get('propertyId'));
    result.params.set('propertyId', result.propertyId);
  }
  if (resource === 'detail') { result.id = uuid(id); return result; }
  if (resource === 'create') return result;
  if (params.has('status')) result.status = choice(params.get('status'), staffAdminStatuses);
  if (params.has('roleCode')) result.roleCode = choice(params.get('roleCode'), staffAdminRoleCodes);
  if (params.has('username')) {
    const raw = params.get('username')!;
    // Match Java's trim/control checks, without changing SQL literal search semantics.
    if (/\p{Cc}/u.test(raw)) fail();
    const trimmed = raw.replace(/^ +| +$/g, '');
    if (trimmed.length < 1 || trimmed.length > 80) fail();
  }
  if (params.has('limit')) {
    const raw = params.get('limit')!;
    if (!/^[0-9]{1,3}$/.test(raw)) fail();
    result.limit = Number(raw);
    if (result.limit < 1 || result.limit > 100) fail();
  }
  if (params.has('cursor')) cursor(params.get('cursor'));
  return result;
}

function scope(value: unknown, query: StaffAdminQuery): StaffAdminScopeDTO {
  const raw = object(value);
  const kind = choice(raw.kind, ['PROPERTY', 'ALL_PROPERTIES']);
  const ids = propertyIds(raw.propertyIds);
  if (kind !== query.scope || (kind === 'PROPERTY' && (ids.length !== 1 || ids[0] !== query.propertyId))) fail();
  return { kind, propertyIds: ids };
}
function timestamp(value: unknown): { value: string; key: string } {
  const raw = text(value, 30);
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$/.exec(raw);
  if (!match || !Number.isFinite(Date.parse(raw)) || new Date(raw).toISOString().slice(0, 19) !== match[1]) return fail();
  return { value: raw, key: `${match[1]}.${(match[2] ?? '').padEnd(9, '0')}Z` };
}
function user(value: unknown, org: string, selectedScope: StaffAdminScopeDTO, query: StaffAdminQuery): StaffAdminUserDTO {
  const raw = object(value);
  const id = uuid(raw.id), organizationId = uuid(raw.organizationId);
  const properties = propertyIds(raw.propertyIds);
  const status = choice(raw.status, staffAdminStatuses), roleCode = choice(raw.roleCode, staffAdminRoleCodes);
  const created = timestamp(raw.createdAt), updated = timestamp(raw.updatedAt);
  if (organizationId !== org || (query.id !== undefined && id !== query.id)
    || (query.status !== undefined && status !== query.status) || (query.roleCode !== undefined && roleCode !== query.roleCode)
    || (selectedScope.kind === 'PROPERTY' && !properties.includes(query.propertyId!))
    || (selectedScope.kind === 'ALL_PROPERTIES' && properties.some(p => !selectedScope.propertyIds.includes(p)))
    || updated.key < created.key || !Number.isSafeInteger(raw.version) || (raw.version as number) < 0) fail();
  return { id, username: text(raw.username, 80), workEmail: text(raw.workEmail, 320), status, roleCode,
    membershipStatus: choice(raw.membershipStatus, ['ACTIVE', 'INACTIVE']), organizationId, propertyIds: properties,
    createdAt: created.value, updatedAt: updated.value, version: raw.version as number };
}

/** Explicit allowlist projection. No entity/unknown fields, pagination or business transformations. */
export function projectStaffAdminResponse(value: unknown, resource: StaffAdminResource, query: StaffAdminQuery): StaffAdminRolesDTO | StaffAdminPageDTO | StaffAdminDetailDTO {
  const raw = object(value), organizationId = uuid(raw.organizationId);
  if (resource === 'roles') {
    const items = array(raw.items).map(value => {
      const role = object(value);
      return { code: choice(role.code, staffAdminRoleCodes), name: text(role.name, 120) };
    });
    if (items.length !== staffAdminRoleCodes.length || items.some((role, i) => role.code !== staffAdminRoleCodes[i])) fail();
    return { organizationId, items };
  }
  const selectedScope = scope(raw.scope, query);
  if (resource === 'detail') return { organizationId, scope: selectedScope, item: user(raw.item, organizationId, selectedScope, query) };
  if (raw.limit !== query.limit) fail();
  const items = array(raw.items).map(value => user(value, organizationId, selectedScope, query));
  if (items.length > query.limit || new Set(items.map(item => item.id)).size !== items.length) fail();
  for (let i = 1; i < items.length; i++) {
    // PostgreSQL COLLATE "C" compares UTF-8 bytes, not browser locale or UTF-16 ordering.
    const comparison = Buffer.compare(Buffer.from(items[i - 1].username, 'utf8'), Buffer.from(items[i].username, 'utf8'));
    if (comparison > 0 || (comparison === 0 && items[i - 1].id >= items[i].id)) fail();
  }
  const nextCursor = raw.nextCursor === null ? null : cursor(raw.nextCursor);
  if (nextCursor !== null && items.length !== query.limit) fail();
  return { organizationId, scope: selectedScope, items, limit: query.limit, nextCursor };
}

export function projectStaffAdminCreated(value: unknown, query: StaffAdminQuery): StaffAdminUserDTO {
  const raw = object(value), organizationId = uuid(raw.organizationId);
  const item = user(raw, organizationId, { kind: query.scope!, propertyIds: query.scope === 'PROPERTY' ? [query.propertyId!] : propertyIds(raw.propertyIds) }, query);
  if (item.status !== 'SUSPENDED' || item.membershipStatus !== 'ACTIVE' || item.roleCode === 'SUPER_ADMIN' || item.version !== 0) fail();
  return item;
}
