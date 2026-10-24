import { NextResponse, type NextRequest } from 'next/server';
import { proxyStaffAdminCreate } from '../mutation-proxy';
import { proxyStaffAdmin } from '../proxy';

export function GET(request: NextRequest) { return proxyStaffAdmin(request, 'users'); }
export function POST(request: NextRequest) { return proxyStaffAdminCreate(request); }
const reject = () => new NextResponse(null, { status: 405, headers: { 'cache-control': 'private, no-store', allow: 'GET, POST' } });
export { reject as PUT, reject as PATCH, reject as DELETE, reject as HEAD, reject as OPTIONS };
