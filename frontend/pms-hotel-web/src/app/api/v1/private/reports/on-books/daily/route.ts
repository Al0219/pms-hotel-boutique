import { NextRequest, NextResponse } from "next/server";

import { backendStaffRequest, staffAccessCookie } from "@/lib/bff/staff-auth";

export const dynamic = "force-dynamic";

const headers = { "cache-control": "private, no-store" };
const uuidPattern = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

function error(status: number, message: string) {
  return NextResponse.json({ error: message }, { status, headers });
}

function day(value: string | null): number | null {
  if (!value || !dayPattern.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : null;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_REPORT_RESPONSE");
  return value as Record<string, unknown>;
}

function nonnegativeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("INVALID_REPORT_RESPONSE");
  return value;
}

function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("INVALID_REPORT_RESPONSE");
  return value;
}

function projectResponse(value: unknown, propertyId: string | null, from: string, to: string) {
  const report = record(value);
  const calculatedAt = text(report.calculatedAt);
  if (Number.isNaN(Date.parse(calculatedAt)) || !Array.isArray(report.rows) || report.rows.length > 50_000) {
    throw new Error("INVALID_REPORT_RESPONSE");
  }
  const rows = report.rows.map(value => {
    const row = record(value);
    const id = text(row.propertyId);
    const stayDate = text(row.stayDate);
    if (!uuidPattern.test(id) || (propertyId && id.toLowerCase() !== propertyId.toLowerCase()) ||
      day(stayDate) === null || stayDate < from || stayDate > to) {
      throw new Error("INVALID_REPORT_RESPONSE");
    }
    const physicalRooms = nonnegativeInteger(row.physicalRooms);
    const outOfOrderRooms = nonnegativeInteger(row.outOfOrderRooms);
    const availableRooms = nonnegativeInteger(row.availableRooms);
    const onBooksRooms = nonnegativeInteger(row.onBooksRooms);
    const onBooksPercent = row.onBooksPercent;
    const unavailableReason = row.unavailableReason;
    if (availableRooms !== physicalRooms - outOfOrderRooms ||
      (availableRooms === 0 ? onBooksPercent !== null || unavailableReason !== "NO_AVAILABLE_ROOMS"
        : typeof onBooksPercent !== "number" || !Number.isFinite(onBooksPercent) || onBooksPercent < 0 || unavailableReason !== null)) {
      throw new Error("INVALID_REPORT_RESPONSE");
    }
    return { propertyId: id, timezone: text(row.timezone), currency: text(row.currency), stayDate,
      physicalRooms, outOfOrderRooms, availableRooms, onBooksRooms, onBooksPercent, unavailableReason };
  });
  return { calculatedAt, rows };
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(staffAccessCookie)?.value;
  if (!token) return error(401, "Staff session required");

  const params = request.nextUrl.searchParams;
  if ([...params.keys()].some(key => !["from", "to", "propertyId", "scope"].includes(key)) ||
    [...params.keys()].some(key => params.getAll(key).length !== 1)) return error(400, "Invalid report parameters");
  const from = params.get("from");
  const to = params.get("to");
  const first = day(from);
  const last = day(to);
  const propertyId = params.get("propertyId");
  const scope = params.get("scope");
  if (first === null || last === null || first > last || (last - first) / 86_400_000 >= 366 ||
    Boolean(propertyId) === Boolean(scope) ||
    (propertyId !== null && !uuidPattern.test(propertyId)) ||
    (scope !== null && scope !== "ALL_PROPERTIES")) return error(400, "Invalid report parameters");

  const query = new URLSearchParams({ from: from!, to: to! });
  if (propertyId) query.set("propertyId", propertyId);
  else query.set("scope", "ALL_PROPERTIES");
  try {
    const upstream = await backendStaffRequest(`/api/v1/reports/on-books/daily?${query}`, {
      method: "GET", headers: { authorization: `Bearer ${token}` }, signal: request.signal,
    });
    if (!upstream.ok) return error([400, 401, 403].includes(upstream.status) ? upstream.status : 503, "Report unavailable");
    return NextResponse.json(projectResponse(await upstream.json(), propertyId, from!, to!), { headers });
  } catch {
    return error(503, "Report unavailable");
  }
}
