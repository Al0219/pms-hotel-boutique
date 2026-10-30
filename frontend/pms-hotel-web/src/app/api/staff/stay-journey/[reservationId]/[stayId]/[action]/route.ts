import { NextRequest, NextResponse } from 'next/server';
import { backendStaffRequest, staffAccessCookie } from '@/lib/bff/staff-auth';
import { mapDocumentFile, mapJourneyDocument, mapJourneyRequests, mapJourneySummary, mapSimulatedReceipt } from '@/modules/stay-journey';
const headers = { 'cache-control': 'private, no-store' };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const tokens = ['demo_visa_approved', 'demo_mastercard_approved', 'demo_amex_approved', 'demo_card_declined', 'demo_gateway_error'];
type Context = { params: Promise<{ reservationId: string; stayId: string; action: string }> };
async function proxy(request: NextRequest, context: Context) {
  const fail = (status: number) => NextResponse.json({ error: 'Stay operation unavailable' }, { status, headers });
  const token = request.cookies.get(staffAccessCookie)?.value; if (!token) return fail(401);
  const params = await context.params, reservation = params.reservationId.toLowerCase(), stay = params.stayId.toLowerCase(), action = params.action;
  const property = request.nextUrl.searchParams.get('propertyId')?.toLowerCase();
  if (!property || ![property, reservation, stay].every(v => uuid.test(v)) || [...request.nextUrl.searchParams.keys()].some(k => k !== 'propertyId') || request.nextUrl.searchParams.getAll('propertyId').length !== 1) return fail(400);
  const write = ['payments', 'reconcile'].includes(action) || action==='document-file' && request.method==='POST';
  if (!(write ? request.method === 'POST' : request.method === 'GET' && ['requests', 'summary', 'document', 'document-file'].includes(action))) return fail(405);
  let body: string | undefined, key: string | null = null;
  if (write) {
    if (request.headers.get('origin') !== new URL(process.env.PMS_WEB_PUBLIC_URL ?? 'http://localhost:3001').origin) return fail(403);
    if (!request.headers.get('content-type')?.startsWith('application/json')) return fail(400);
    const reader = request.body?.getReader(); if (!reader) return fail(400);
    let bytes = 0, raw = ''; const decoder = new TextDecoder('utf-8', { fatal: true });
    try {
      while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.byteLength; if (bytes > 2048) { await reader.cancel(); return fail(400); } raw += decoder.decode(chunk.value, { stream: true }); }
      const input = JSON.parse(raw + decoder.decode());
      if (!input || typeof input !== 'object' || Array.isArray(input)) return fail(400);
      if (action === 'payments') {
        key = request.headers.get('idempotency-key');
        if (!key || !/^[A-Za-z0-9-]{16,100}$/.test(key) || Object.keys(input).length !== 3 || Object.keys(input).some(k => !['amount', 'currency', 'instrumentToken'].includes(k)) || typeof input.amount !== 'string'
          || !/^\d{1,15}(\.\d{1,2})?$/.test(input.amount) || input.currency !== 'GTQ' || !tokens.includes(input.instrumentToken)) return fail(400);
        body = JSON.stringify({ amount: input.amount, currency: 'GTQ', instrumentToken: input.instrumentToken });
      } else { if (Object.keys(input).length) return fail(400); body = '{}'; }
    } catch { return fail(400); } finally { reader.releaseLock(); }
  }
  try {
    const upstream = await backendStaffRequest(`/api/v1/properties/${property}/stay-journey/${reservation}/${stay}/${action}`, { method: write ? 'POST' : 'GET', signal: request.signal,
      headers: { authorization: `Bearer ${token}`, ...(write ? { 'content-type': 'application/json', ...(key ? { 'idempotency-key': key } : {}) } : {}) }, ...(body ? { body } : {}) });
    if (upstream.status !== 200) return fail([400, 401, 403, 404, 409].includes(upstream.status) ? upstream.status : 503);
    const raw: unknown = await upstream.json();
    const result = action === 'document-file' ? mapDocumentFile(raw,(raw as {documentId:string}).documentId) : action === 'requests' ? mapJourneyRequests(raw) : action === 'payments' ? mapSimulatedReceipt(raw)
      : action === 'document' ? mapJourneyDocument(raw, property, reservation, stay) : mapJourneySummary(raw, property, reservation, stay);
    return NextResponse.json(result, { headers });
  } catch { return fail(503); }
}
export const GET = proxy;
export const POST = proxy;
