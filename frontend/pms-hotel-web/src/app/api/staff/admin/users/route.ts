import type { NextRequest } from 'next/server';
import { proxyStaffAdmin } from '../proxy';

export function GET(request: NextRequest) { return proxyStaffAdmin(request, 'users'); }
export { rejectStaffAdminMethod as POST, rejectStaffAdminMethod as PUT, rejectStaffAdminMethod as PATCH,
  rejectStaffAdminMethod as DELETE, rejectStaffAdminMethod as HEAD, rejectStaffAdminMethod as OPTIONS } from '../proxy';
