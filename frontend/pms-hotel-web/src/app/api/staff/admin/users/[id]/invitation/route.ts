import type { NextRequest } from 'next/server';
import { proxyInvitation } from '../../../invitation-proxy';
import { rejectStaffAdminMutationMethod } from '../../../mutation-proxy';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, context: Context) { return proxyInvitation(request, (await context.params).id); }
export async function POST(request: NextRequest, context: Context) { return proxyInvitation(request, (await context.params).id); }
const reject = () => rejectStaffAdminMutationMethod('GET, POST');
export { reject as PATCH, reject as PUT, reject as DELETE, reject as HEAD, reject as OPTIONS };
