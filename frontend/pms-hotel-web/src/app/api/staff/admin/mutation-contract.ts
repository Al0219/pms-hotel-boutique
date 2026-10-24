import { normalizePasswordLoginEmail } from '@/lib/login-input';
import { staffAdminRoleCodes, staffAdminStatuses } from './staff-admin.dto';
import type { StaffAdminAssignableRole, StaffAdminCommandDTO, StaffAdminMutationResource,
  StaffAdminMutationResultDTO, StaffAdminRequestedStatus } from './mutation.dto';

const uuidPattern = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const fail = (): never => { throw new Error('INVALID_STAFF_ADMIN_COMMAND'); };
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  return value as Record<string, unknown>;
}
function uuid(value: unknown): string {
  if (typeof value !== 'string' || !uuidPattern.test(value)) return fail();
  return value.toLowerCase();
}

/** Commands are flat objects with scalar values or a UUID array. JSON.parse alone
 * loses duplicate keys and turns 1.0/1e0 into integers, unlike Backend's strict DTO. */
export function parseStaffAdminCommand(raw: string, resource: StaffAdminMutationResource): StaffAdminCommandDTO {
  const value = object(JSON.parse(raw)); // Validates complete JSON syntax, including trailing data.
  const tokens = raw.match(/"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}\[\],:]/g) ?? [];
  let i = 0;
  if (tokens[i++] !== '{') fail();
  const seen = new Set<string>();
  let versionLexeme: string | undefined;
  while (tokens[i] !== '}') {
    const name = JSON.parse(tokens[i++]) as unknown;
    if (typeof name !== 'string' || seen.has(name) || tokens[i++] !== ':') return fail();
    seen.add(name);
    if (tokens[i] === '[') {
      i++;
      while (tokens[i] !== ']') {
        if (!tokens[i]?.startsWith('"')) fail();
        i++;
        if (tokens[i] !== ',') break;
        i++;
      }
      if (tokens[i++] !== ']') fail();
    } else {
      if (name === 'expectedVersion') versionLexeme = tokens[i];
      if (!tokens[i] || ['{', '}', ':', ','].includes(tokens[i])) fail();
      i++;
    }
    if (tokens[i] !== ',') break;
    i++;
  }
  if (tokens[i++] !== '}' || i !== tokens.length) fail();
  const allowed = resource === 'contact' ? ['workEmail', 'expectedVersion']
    : resource === 'membership' ? ['roleCode', 'propertyIds', 'expectedVersion'] : ['status', 'expectedVersion'];
  if (seen.size !== allowed.length || [...seen].some(key => !allowed.includes(key))) fail();
  if (!versionLexeme || !/^-?(?:0|[1-9]\d*)$/.test(versionLexeme)
    || !Number.isSafeInteger(value.expectedVersion) || (value.expectedVersion as number) < 0
    || (value.expectedVersion as number) > Number.MAX_SAFE_INTEGER - 1) fail();
  const expectedVersion = value.expectedVersion as number;
  if (resource === 'contact') {
    const workEmail = normalizePasswordLoginEmail(value.workEmail);
    if (!workEmail) return fail();
    return { workEmail, expectedVersion };
  }
  if (resource === 'status') {
    if (typeof value.status !== 'string' || value.status === 'ACTIVE'
      || !staffAdminStatuses.includes(value.status as StaffAdminRequestedStatus)) fail();
    return { status: value.status as StaffAdminRequestedStatus, expectedVersion };
  }
  if (typeof value.roleCode !== 'string' || value.roleCode === 'SUPER_ADMIN'
    || !staffAdminRoleCodes.includes(value.roleCode as StaffAdminAssignableRole) || !Array.isArray(value.propertyIds)) fail();
  const propertyIds = (value.propertyIds as unknown[]).map(uuid);
  if (new Set(propertyIds).size !== propertyIds.length) fail();
  return { roleCode: value.roleCode as StaffAdminAssignableRole, propertyIds, expectedVersion };
}

/** Allowlist only: an acknowledgement never becomes a StaffView or editable session. */
export function projectStaffAdminMutationResult(value: unknown, id: string, expectedVersion: number): StaffAdminMutationResultDTO {
  const raw = object(value), organizationId = uuid(raw.organizationId), staffUserId = uuid(raw.staffUserId);
  if (staffUserId !== id || typeof raw.changed !== 'boolean' || !Number.isSafeInteger(raw.version)
    || raw.version !== expectedVersion + (raw.changed ? 1 : 0)) fail();
  return { organizationId, staffUserId, version: raw.version as number, changed: raw.changed as boolean };
}

/** Creation has no expectedVersion: it allocates a new suspended identity. */
export function parseStaffAdminCreate(raw: string) {
  const value = object(JSON.parse(raw));
  // Read flat object keys without confusing string content with JSON syntax.
  // This also rejects duplicate keys before JSON.parse can silently collapse them.
  const tokens = raw.match(/"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}\[\],:]/g) ?? [];
  let i = 0;
  const keys = new Set<string>();
  if (tokens[i++] !== '{') fail();
  while (tokens[i] !== '}') {
    const key: unknown = JSON.parse(tokens[i++]);
    if (typeof key !== 'string' || keys.has(key) || tokens[i++] !== ':') return fail();
    keys.add(key);
    if (tokens[i] === '[') {
      i++;
      while (tokens[i] !== ']') {
        if (!tokens[i]?.startsWith('"')) fail();
        i++;
        if (tokens[i] !== ',') break;
        i++;
      }
      if (tokens[i++] !== ']') fail();
    } else {
      if (!tokens[i] || ['{', '}', ':', ','].includes(tokens[i])) fail();
      i++;
    }
    if (tokens[i] !== ',') break;
    i++;
  }
  if (tokens[i++] !== '}' || i !== tokens.length || keys.size !== 4
    || !['username', 'workEmail', 'roleCode', 'propertyIds'].every(key => keys.has(key))) fail();
  if (typeof value.username !== 'string') return fail();
  const username = value.username.trim();
  if (!username || username.length > 80 || /\p{Cc}/u.test(username)) fail();
  // Parse again through the established command validator after the exact key check.
  const contact = parseStaffAdminCommand(JSON.stringify({ workEmail: value.workEmail, expectedVersion: 0 }), 'contact');
  const membership = parseStaffAdminCommand(JSON.stringify({ roleCode: value.roleCode, propertyIds: value.propertyIds, expectedVersion: 0 }), 'membership');
  return { username, workEmail: 'workEmail' in contact ? contact.workEmail : fail(),
    roleCode: 'roleCode' in membership ? membership.roleCode : fail(), propertyIds: 'propertyIds' in membership ? membership.propertyIds : fail() };
}
