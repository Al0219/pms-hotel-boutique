import { NextRequest } from 'next/server';
import { proxyHousekeeping } from '../../../proxy';
export async function POST(request: NextRequest, context: { params: Promise<{ roomId: string }> }) {
  return proxyHousekeeping(request, (await context.params).roomId, 'tracking');
}
