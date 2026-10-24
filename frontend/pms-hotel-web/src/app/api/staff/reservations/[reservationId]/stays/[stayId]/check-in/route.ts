import { NextRequest } from 'next/server';
import { proxyStayLifecycle } from '../../../../lifecycle-proxy';

export async function POST(request: NextRequest, context: { params: Promise<{ reservationId: string; stayId: string }> }) {
  const { reservationId, stayId } = await context.params;
  return proxyStayLifecycle(request, reservationId, stayId, 'check-in');
}
