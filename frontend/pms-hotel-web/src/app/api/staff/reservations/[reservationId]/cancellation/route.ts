import { NextRequest } from 'next/server';
import { proxyCancellation } from '../../cancellation-proxy';

export async function POST(request: NextRequest, context: { params: Promise<{ reservationId: string }> }) {
  return proxyCancellation(request, (await context.params).reservationId, 'cancellation');
}
