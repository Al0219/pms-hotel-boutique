import { type NextRequest } from 'next/server';
import { guestReservationsRequest } from '@/lib/bff/guest-reservations';
export function GET(request: NextRequest) { return guestReservationsRequest(request, 'list'); }
