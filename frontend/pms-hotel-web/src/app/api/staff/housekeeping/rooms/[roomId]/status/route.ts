import { NextRequest } from 'next/server';
import { proxyHousekeeping } from '../../../proxy';
export async function PUT(request: NextRequest, context: { params: Promise<{ roomId: string }> }) {
  return proxyHousekeeping(request, (await context.params).roomId, 'status');
}
