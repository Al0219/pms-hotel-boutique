import { NextRequest } from 'next/server';
import { proxyRoomAssignment } from '../../../../assignment-proxy';

type Context = { params: Promise<{ reservationId: string; stayId: string }> };
export async function GET(request: NextRequest, context: Context) {
  const { reservationId, stayId } = await context.params;
  return proxyRoomAssignment(request, reservationId, stayId);
}
export async function PUT(request: NextRequest, context: Context) {
  const { reservationId, stayId } = await context.params;
  return proxyRoomAssignment(request, reservationId, stayId);
}
