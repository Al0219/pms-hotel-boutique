import { NextRequest, NextResponse } from "next/server";

import { parseCurrentHousekeepingQuery } from "@/lib/bff/current-housekeeping-query";
import { backendStaffRequest, staffAccessCookie } from "@/lib/bff/staff-auth";

export const dynamic = "force-dynamic";
const headers = { "cache-control": "private, no-store" };
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const invalid = () => new Error("INVALID_HOUSEKEEPING_REPORT");
function error(status: number) { return NextResponse.json({ error: "Report unavailable" }, { status, headers }); }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw invalid();
  return value;
}
function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw invalid();
  return value;
}
function project(value: unknown, propertyId: string | null) {
  const report = record(value), calculatedAt = text(report.calculatedAt);
  if (!/^\d{4}-\d{2}-\d{2}T.*Z$/.test(calculatedAt) || !Number.isFinite(Date.parse(calculatedAt)) ||
      !Array.isArray(report.rows)) throw invalid();
  const seen = new Set<string>(), timezones = new Set<string>();
  const rows = report.rows.map(value => {
    const row = record(value), id = text(row.propertyId), timezone = text(row.timezone);
    if (!uuid.test(id) || (propertyId && id.toLowerCase() !== propertyId.toLowerCase()) || seen.has(id.toLowerCase())) throw invalid();
    seen.add(id.toLowerCase());
    if (!timezones.has(timezone)) {
      new Intl.DateTimeFormat("en", { timeZone: timezone });
      timezones.add(timezone);
    }
    const physicalRooms = count(row.physicalRooms), trackedRooms = count(row.trackedRooms), untrackedRooms = count(row.untrackedRooms);
    const dirtyRooms = count(row.dirtyRooms), cleanRooms = count(row.cleanRooms), inspectedRooms = count(row.inspectedRooms), dndRooms = count(row.dndRooms);
    if (physicalRooms !== trackedRooms + untrackedRooms || trackedRooms !== dirtyRooms + cleanRooms + inspectedRooms || dndRooms > trackedRooms) throw invalid();
    return { propertyId: id, timezone, physicalRooms, trackedRooms, untrackedRooms, dirtyRooms, cleanRooms, inspectedRooms, dndRooms };
  });
  return { calculatedAt, rows };
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(staffAccessCookie)?.value;
  if (!token) return error(401);
  const filters = parseCurrentHousekeepingQuery(request.nextUrl.searchParams);
  if (!filters) return error(400);
  try {
    const upstream = await backendStaffRequest(`/api/v1/reports/housekeeping/current?${filters.query}`, {
      method: "GET", headers: { authorization: `Bearer ${token}` }, signal: request.signal,
    });
    if (!upstream.ok) return error([400, 401, 403].includes(upstream.status) ? upstream.status : 503);
    return NextResponse.json(project(await upstream.json(), filters.propertyId), { headers });
  } catch { return error(503); }
}
