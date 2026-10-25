import type { NextRequest } from 'next/server';
import { proxyStaffReservations } from './proxy';
import { proxyStaffBooking } from './creation-proxy';

export function GET(request: NextRequest) { return proxyStaffReservations(request); }
export function POST(request: NextRequest) { return proxyStaffBooking(request, false); }
