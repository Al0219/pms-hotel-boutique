import { passwordExceedsByteLimit } from '@/lib/login-input';
const invalid = (): never => { throw new Error('INVALID_STAFF_INVITATION'); };
/** Flat scalar JSON only, duplicate keys rejected before projecting. */
function flat(raw: string, names: string[]): Record<string, unknown> {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const tokens = raw.match(/"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}\[\],:]/g) ?? [];
  let i = 1; const seen = new Set<string>();
  if (tokens[0] !== '{') invalid();
  while (tokens[i] !== '}') {
    const key: unknown = JSON.parse(tokens[i++]);
    if (typeof key !== 'string' || seen.has(key) || !names.includes(key) || tokens[i++] !== ':') return invalid();
    seen.add(key);
    if (!tokens[i] || ['{', '}', '[', ']', ':', ','].includes(tokens[i])) invalid();
    if (key === 'expectedVersion' && !/^(?:0|[1-9]\d*)$/.test(tokens[i])) invalid();
    i++;
    if (tokens[i] !== ',') break;
    i++;
  }
  if (tokens[i++] !== '}' || i !== tokens.length || seen.size !== names.length) invalid();
  return value as Record<string, unknown>;
}
export function parseInvitationCommand(raw: string) {
  const value = flat(raw, ['expectedVersion']);
  if (!Number.isSafeInteger(value.expectedVersion) || (value.expectedVersion as number) < 0 || (value.expectedVersion as number) > Number.MAX_SAFE_INTEGER - 1) invalid();
  return { expectedVersion: value.expectedVersion as number };
}
export function parseInvitationConsume(raw: string) {
  const value = flat(raw, ['token', 'password']);
  if (typeof value.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value.token) || typeof value.password !== 'string'
    || value.password.length < 8 || value.password.length > 50 || !value.password.trim() || passwordExceedsByteLimit(value.password)) return invalid();
  return { token: value.token, password: value.password };
}
export function projectInvitationInfo(value: unknown, id: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const v = value as Record<string, unknown>;
  if (typeof v.organizationId !== 'string' || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v.organizationId)
    || v.staffUserId !== id || !Number.isSafeInteger(v.version) || (v.version as number) < 0
    || typeof v.invitationAllowed !== 'boolean' || typeof v.activationAllowed !== 'boolean' || typeof v.credentialPrepared !== 'boolean'
    || (v.activationAllowed && !v.credentialPrepared)) return invalid();
  return { organizationId: v.organizationId, staffUserId: id, version: v.version as number,
    invitationAllowed: v.invitationAllowed, activationAllowed: v.activationAllowed, credentialPrepared: v.credentialPrepared };
}
