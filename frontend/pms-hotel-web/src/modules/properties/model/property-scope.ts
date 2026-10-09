import type { StaffSession } from "@/modules/auth";

export type PropertyScope = { kind: "PROPERTY"; propertyIds: [string] } | { kind: "ALL_PROPERTIES"; propertyIds: string[] };
export const allProperties = "ALL_PROPERTIES";

/** Initial Staff context only; identities come exclusively from authorized memberships. */
export function defaultStaffProperty(session: StaffSession): string {
  const active = session.memberships.filter(item => item.active);
  return (active.find(item => item.propertyCode === 'HB-GT-DEMO') ?? active[0])?.propertyId ?? '';
}

export function resolvePropertyScope(session: StaffSession, selection: string): PropertyScope | null {
  const ids = session.memberships.filter(item => item.active).map(item => item.propertyId).sort();
  if (selection === allProperties) {
    return session.permissions.includes("MULTI_PROPERTY_READ") && ids.length > 0
      ? { kind: "ALL_PROPERTIES", propertyIds: ids } : null;
  }
  return ids.includes(selection) ? { kind: "PROPERTY", propertyIds: [selection] } : null;
}
