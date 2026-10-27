import { NextRequest } from 'next/server';
import { proxyStaffFolio } from '../../folio-proxy';
export async function GET(request: NextRequest, context: { params: Promise<{ folioId: string }> }) {
  return proxyStaffFolio(request, 'movements', (await context.params).folioId);
}
