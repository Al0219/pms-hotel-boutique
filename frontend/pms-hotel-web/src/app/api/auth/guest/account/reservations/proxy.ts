import { NextRequest, NextResponse } from 'next/server';
import { backendGuestRequest, guestAccessCookie } from '@/lib/bff/guest-auth';
import { isGuestReservationUuid, mapRealGuestReservationPage, mapRealGuestReservationDetail } from '@/modules/account';
const headers = { 'cache-control': 'private, no-store' };
export async function guestReservationRead(request: NextRequest, id?: string) {
  const fail = (status: number) => NextResponse.json({ error: 'Guest reservations unavailable' }, { status, headers });
  const token = request.cookies.get(guestAccessCookie)?.value;
  if (!token) return fail(401);
  const query = request.nextUrl.searchParams;
  if (id !== undefined && (!isGuestReservationUuid(id) || query.size > 0)) return fail(400);
  if (id === undefined && Array.from(query.keys()).some(key => !['page', 'size'].includes(key) || query.getAll(key).length !== 1)) return fail(400);
  const pageText = query.get('page') ?? '0', sizeText = query.get('size') ?? '20';
  const page = Number(pageText), size = Number(sizeText);
  if (!/^[0-9]+$/.test(pageText) || !/^[0-9]+$/.test(sizeText) || !Number.isSafeInteger(page) || page > 2147483647 || size < 1 || size > 50) return fail(400);
  try {
    const path = id === undefined ? '?' + new URLSearchParams({ page: String(page), size: String(size) }) : '/' + id;
    const upstream = await backendGuestRequest('/api/v1/guest-auth/account/reservations' + path,
      { method: 'GET', headers: { authorization: `Bearer ${token}` }, signal: request.signal });
    if (upstream.status !== 200) return fail([400,401,404].includes(upstream.status) ? upstream.status : 503);
    const body: unknown = await upstream.json();
    const data = id === undefined ? mapRealGuestReservationPage(body, undefined, page, size) : mapRealGuestReservationDetail(body, undefined, id);
    return NextResponse.json(data, { headers });
  } catch { return fail(503); }
}
