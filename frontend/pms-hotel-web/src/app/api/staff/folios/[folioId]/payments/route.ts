import { NextRequest } from 'next/server';
import { proxyStaffFolio } from '../../folio-proxy';
export async function POST(request: NextRequest, context: { params: Promise<{ folioId: string }> }) {
  return proxyStaffFolio(request, 'payments', (await context.params).folioId);
}
