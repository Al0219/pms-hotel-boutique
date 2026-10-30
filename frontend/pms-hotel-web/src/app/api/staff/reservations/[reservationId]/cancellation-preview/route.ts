import { NextRequest } from 'next/server';
import { proxyCancellation } from '../../cancellation-proxy';

export async function GET(request: NextRequest, context: { params: Promise<{ reservationId: string }> }) {
  return proxyCancellation(request, (await context.params).reservationId, 'cancellation-preview');
}
