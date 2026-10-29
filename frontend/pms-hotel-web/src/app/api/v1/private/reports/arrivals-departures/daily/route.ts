import { NextRequest, NextResponse } from "next/server";

import { parseDailyReportQuery } from "@/lib/bff/daily-report-query";
import { backendStaffRequest, staffAccessCookie } from "@/lib/bff/staff-auth";

export const dynamic = "force-dynamic";
const headers = { "cache-control": "private, no-store" };
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;

function error(status: number) {
  return NextResponse.json({ error: "Report unavailable" }, { status, headers });
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_REPORT");
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("INVALID_REPORT");
  return value;
}

function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("INVALID_REPORT");
  return value;
}

function project(value: unknown, filters: NonNullable<ReturnType<typeof parseDailyReportQuery>>) {
  const report = record(value), calculatedAt = text(report.calculatedAt);
  if (!/^\d{4}-\d{2}-\d{2}T.*Z$/.test(calculatedAt) || !Number.isFinite(Date.parse(calculatedAt)) ||
    !Array.isArray(report.rows) || report.rows.length > 50_000) throw new Error("INVALID_REPORT");
  const seen = new Set<string>(), timezones = new Set<string>();
  const rows = report.rows.map(value => {
    const row = record(value), propertyId = text(row.propertyId), date = text(row.date);
    const day = Date.parse(`${date}T00:00:00.000Z`);
    const key = `${propertyId.toLowerCase()}:${date}`;
    if (!uuid.test(propertyId) || (filters.propertyId && propertyId.toLowerCase() !== filters.propertyId.toLowerCase()) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(day) || new Date(day).toISOString().slice(0, 10) !== date ||
      date < filters.from || date > filters.to || seen.has(key)) throw new Error("INVALID_REPORT");
    seen.add(key);
    const timezone = text(row.timezone), currency = text(row.currency);
    if (!timezones.has(timezone)) {
      new Intl.DateTimeFormat("en", { timeZone: timezone });
      timezones.add(timezone);
    }
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error("INVALID_REPORT");
    return { propertyId, timezone, currency, date, pendingArrivals: count(row.pendingArrivals), pendingDepartures: count(row.pendingDepartures) };
  });
  return { calculatedAt, rows };
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(staffAccessCookie)?.value;
  if (!token) return error(401);
  const filters = parseDailyReportQuery(request.nextUrl.searchParams);
  if (!filters) return error(400);
  try {
    const upstream = await backendStaffRequest(`/api/v1/reports/arrivals-departures/daily?${filters.query}`, {
      method: "GET", headers: { authorization: `Bearer ${token}` }, signal: request.signal,
    });
    if (!upstream.ok) return error([400, 401, 403].includes(upstream.status) ? upstream.status : 503);
    return NextResponse.json(project(await upstream.json(), filters), { headers });
  } catch { return error(503); }
}
