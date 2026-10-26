import { NextRequest } from 'next/server';
import { guestReservationRead } from '../proxy';
export async function GET(request: NextRequest, context: { params: Promise<{ reservationId: string }> }) {
  return guestReservationRead(request, (await context.params).reservationId);
}
