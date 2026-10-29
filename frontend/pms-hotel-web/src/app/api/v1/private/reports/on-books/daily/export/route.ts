import { NextRequest, NextResponse } from "next/server";

import { acceptsCsv, parseOnBooksQuery } from "@/lib/bff/on-books-query";
import { backendStaffRequest, staffAccessCookie } from "@/lib/bff/staff-auth";

export const dynamic = "force-dynamic";
const headers = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };
const error = (status: number, message: string) => NextResponse.json({ error: message }, { status, headers });

// Next otherwise invokes GET for HEAD; a metadata probe must not generate an audited file.
export function HEAD() {
  return new NextResponse(null, { status: 405, headers: { ...headers, allow: "GET" } });
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(staffAccessCookie)?.value;
  if (!token) return error(401, "Staff session required");
  if (!acceptsCsv(request.headers.get("accept"))) return error(406, "Report unavailable");
  const filters = parseOnBooksQuery(request.nextUrl.searchParams);
  if (!filters) return error(400, "Invalid report parameters");
  try {
    const upstream = await backendStaffRequest(`/api/v1/reports/on-books/daily/export?${filters.query}`, {
      method: "GET", headers: { authorization: `Bearer ${token}`, accept: "text/csv" }, signal: request.signal,
    });
    if (!upstream.ok) return error([400, 401, 403, 406].includes(upstream.status) ? upstream.status : 503, "Report unavailable");
    const disposition = `attachment; filename="on-books-daily_${filters.from}_${filters.to}.csv"`;
    if (upstream.status !== 200 || !/^text\/csv\s*;\s*charset=utf-8$/i.test(upstream.headers.get("content-type") ?? "") ||
        upstream.headers.get("content-disposition") !== disposition) throw new Error("INVALID_CSV_RESPONSE");
    const body = await upstream.arrayBuffer();
    const bytes = new Uint8Array(body);
    if (bytes[0] !== 0xef || bytes[1] !== 0xbb || bytes[2] !== 0xbf) throw new Error("INVALID_CSV_RESPONSE");
    return new NextResponse(body, { headers: { ...headers, "content-type": "text/csv; charset=UTF-8", "content-disposition": disposition } });
  } catch {
    return error(503, "Report unavailable");
  }
}
