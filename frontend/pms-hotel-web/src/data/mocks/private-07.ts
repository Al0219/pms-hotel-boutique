import { http, HttpResponse } from "msw";
import { mapRoles, toRolesDTO } from "@/modules/permissions/mappers/roles.mapper";
import { mapPrivacy } from "@/modules/privacy/mappers/privacy.mapper";
import { mapSecurity } from "@/modules/security/mappers/security.mapper";
import type { RolesDTO } from "@/modules/permissions/dtos/roles.dto";
import type { PrivacyDTO } from "@/modules/privacy/dtos/privacy.dto";
import type { SecurityDTO } from "@/modules/security/dtos/security.dto";
import { object, text, flag, choice } from "@/lib/validation";

/** Approved local fixtures, never authorization or real account data. */
export const private07Keys = {
  roles: "pms:private-07:roles:v1", privacy: "pms:private-07:privacy:v1", security: "pms:private-07:security:v1",
};
export function initialRoles(): RolesDTO {
  return { roles: [
    { role_id: "superadmin", name: "SuperAdmin", user_count: 2, description: null, property_ids: [], permission_ids: [], configured: false },
    { role_id: "gerencia", name: "Gerencia", user_count: 12, description: "Administración y reportes de propiedades de ejemplo.",
      property_ids: ["GT-HB-01", "GT-HB-03"], permission_ids: ["MULTI_PROPERTY_READ", "COMPARE_AVAILABILITY", "CREATE_RESERVATION", "CROSS_PROPERTY_REBOOKING", "VIEW_RATES", "RATE_OVERRIDE"], configured: true },
    { role_id: "recepcion", name: "Recepción", user_count: 45, description: null, property_ids: [], permission_ids: [], configured: false },
    { role_id: "reservas-central", name: "Reservas Central", user_count: 8, description: null, property_ids: [], permission_ids: [], configured: false },
    { role_id: "auditoria", name: "Auditoría", user_count: 4, description: null, property_ids: [], permission_ids: [], configured: false },
  ] };
}
export function initialPrivacy(): PrivacyDTO {
  return { consents: (["Email", "SMS"] as const).map(channel => ({
    consent_id: `marketing-${channel.toLowerCase()}`, subject: "Huésped de ejemplo", purpose: "Marketing",
    channel, active: true, source: "Datos de demostración", updated_at: "2026-09-24T12:00:00.000Z", evidence_version: "demo-v1",
  })), requests: [] };
}
export function initialSecurity(): SecurityDTO {
  return { sessions: [
    { session_id: "staff-current", device: "Equipo actual de ejemplo", browser: "Chrome", last_active: "2026-09-24T12:00:00.000Z", is_current: true, status: "active" },
    { session_id: "staff-tablet", device: "Tablet de ejemplo", browser: "Safari", last_active: "2026-09-24T11:00:00.000Z", is_current: false, status: "active" },
    { session_id: "staff-laptop", device: "Portátil de ejemplo", browser: "Firefox", last_active: "2026-09-23T18:00:00.000Z", is_current: false, status: "active" },
  ], mfa_enabled: false };
}
function read<T>(key: string, initial: () => T, validate: (value: unknown) => unknown): T {
  const stored = localStorage.getItem(key);
  const value: unknown = stored === null ? initial() : JSON.parse(stored);
  validate(value);
  return value as T;
}
function write<T>(key: string, value: T): T {
  localStorage.setItem(key, JSON.stringify(value));
  return value;
}
function safely(operation: () => RolesDTO | PrivacyDTO | SecurityDTO) {
  try { return HttpResponse.json(operation()); }
  catch { return HttpResponse.json({ error: "MOCK_DATA_UNAVAILABLE" }, { status: 409 }); }
}
const base = "*/__mock/private-07";
export const private07Handlers = [
  http.get(`${base}/roles`, () => safely(() => read(private07Keys.roles, initialRoles, mapRoles))),
  http.post(`${base}/roles`, async ({ request }) => {
    const raw: unknown = await request.json();
    return safely(() => {
      const action = object(raw);
      if (action.type === "reset") return write(private07Keys.roles, initialRoles());
      if (action.type !== "save") throw new Error("INVALID_ACTION");
      const current = read(private07Keys.roles, initialRoles, mapRoles);
      const next = toRolesDTO(mapRoles(action));
      // The pre-existing disabled permission cannot be granted through this demo.
      if (next.roles.some(role => role.permission_ids.includes("BYPASS_RESTRICTIONS") &&
        !current.roles.find(old => old.role_id === role.role_id)?.permission_ids.includes("BYPASS_RESTRICTIONS"))) throw new Error("READ_ONLY_PERMISSION");
      return write(private07Keys.roles, next);
    });
  }),
  http.get(`${base}/privacy`, () => safely(() => read(private07Keys.privacy, initialPrivacy, mapPrivacy))),
  http.post(`${base}/privacy`, async ({ request }) => {
    const raw: unknown = await request.json();
    return safely(() => {
      const action = object(raw);
      if (action.type === "reset") return write(private07Keys.privacy, initialPrivacy());
      const data = read(private07Keys.privacy, initialPrivacy, mapPrivacy);
      if (action.type === "consent") {
        const id = text(action.id), active = flag(action.active);
        const consent = data.consents.find(item => item.consent_id === id);
        if (!consent) throw new Error("NOT_FOUND");
        if (consent.active !== active) Object.assign(consent, { active, source: "Centro de privacidad · demo", updated_at: new Date().toISOString() });
      } else if (action.type === "request") {
        const kind = choice(action.kind, ["export", "anonymize"]);
        if (!data.requests.some(item => item.kind === kind && item.status === "pending")) data.requests.push({
          request_id: crypto.randomUUID(), kind, status: "pending", created_at: new Date().toISOString(),
        });
      } else throw new Error("INVALID_ACTION");
      return write(private07Keys.privacy, data);
    });
  }),
  http.get(`${base}/security`, () => safely(() => read(private07Keys.security, initialSecurity, mapSecurity))),
  http.post(`${base}/security`, async ({ request }) => {
    const raw: unknown = await request.json();
    return safely(() => {
      const action = object(raw);
      if (action.type === "reset") return write(private07Keys.security, initialSecurity());
      const data = read(private07Keys.security, initialSecurity, mapSecurity);
      const current = data.sessions.find(session => session.is_current);
      if (action.type === "restart") {
        if (current) { current.status = "active"; current.last_active = new Date().toISOString(); }
        else data.sessions.push({ ...initialSecurity().sessions[0], last_active: new Date().toISOString() });
      } else {
        if (current?.status !== "active") throw new Error("DEMO_SESSION_CLOSED");
        if (action.type === "revoke") {
          const target = data.sessions.find(session => session.session_id === text(action.id));
          if (!target) throw new Error("NOT_FOUND");
          target.status = "closed";
        } else if (action.type === "revoke-others") {
          data.sessions.forEach(session => { if (!session.is_current) session.status = "closed"; });
        } else if (action.type === "mfa") data.mfa_enabled = flag(action.enabled);
        else throw new Error("INVALID_ACTION");
      }
      return write(private07Keys.security, data);
    });
  }),
];
