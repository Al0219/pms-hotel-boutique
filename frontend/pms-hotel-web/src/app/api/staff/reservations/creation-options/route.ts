import type { NextRequest } from 'next/server';
import { proxyStaffBooking } from '../creation-proxy';
export function GET(request: NextRequest) { return proxyStaffBooking(request, true); }
