import { type NextRequest } from 'next/server';
import { guestReservationsRequest } from '@/lib/bff/guest-reservations';
export async function GET(request: NextRequest, { params }: { params: Promise<{ reservationId: string; stayId: string }> }) {
  return guestReservationsRequest(request, 'stay', await params);
}
