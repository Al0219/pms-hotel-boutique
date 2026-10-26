import { NextResponse, type NextRequest } from 'next/server';
import { consumeInvitation } from '@/app/api/staff/admin/invitation-proxy';
export function POST(request: NextRequest) { return consumeInvitation(request); }
const reject = () => new NextResponse(null, { status: 405, headers: { allow: 'POST', 'cache-control': 'private, no-store' } });
export { reject as GET, reject as PATCH, reject as PUT, reject as DELETE, reject as HEAD, reject as OPTIONS };
