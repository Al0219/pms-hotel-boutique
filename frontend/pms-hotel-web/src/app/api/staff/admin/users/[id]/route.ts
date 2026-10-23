import type { NextRequest } from 'next/server';
import { proxyStaffAdmin } from '../../proxy';
import { proxyStaffAdminMutation, rejectStaffAdminMutationMethod } from '../../mutation-proxy';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyStaffAdmin(request, 'detail', id);
}
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyStaffAdminMutation(request, 'contact', id);
}
const reject = () => rejectStaffAdminMutationMethod('GET, PATCH');
export { reject as POST, reject as PUT, reject as DELETE, reject as HEAD, reject as OPTIONS };
