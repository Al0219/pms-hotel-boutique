import type { NextRequest } from 'next/server';
import { proxyStaffAdminMutation, rejectStaffAdminMutationMethod } from '../../../mutation-proxy';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyStaffAdminMutation(request, 'status', id);
}
const reject = () => rejectStaffAdminMutationMethod('PATCH');
export { reject as GET, reject as POST, reject as PUT, reject as DELETE, reject as HEAD, reject as OPTIONS };
