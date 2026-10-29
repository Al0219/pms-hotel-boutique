import type { NextRequest } from 'next/server';
import { proxyStaffAdminMutation, rejectStaffAdminMutationMethod } from '../../../mutation-proxy';

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyStaffAdminMutation(request, 'membership', id);
}
const reject = () => rejectStaffAdminMutationMethod('PUT');
export { reject as GET, reject as POST, reject as PATCH, reject as DELETE, reject as HEAD, reject as OPTIONS };
