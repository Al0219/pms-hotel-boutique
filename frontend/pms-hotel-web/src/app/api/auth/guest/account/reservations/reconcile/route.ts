import { type NextRequest } from 'next/server';
import { guestReservationsRequest } from '@/lib/bff/guest-reservations';
export function POST(request: NextRequest) { return guestReservationsRequest(request, 'reconcile'); }
