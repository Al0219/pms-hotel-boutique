import {NextRequest} from 'next/server';
import {guestReservationSummary} from '@/lib/bff/guest-reservation-summary';
export async function GET(request:NextRequest,{params}:{params:Promise<{reservationId:string}>}){return guestReservationSummary(request,(await params).reservationId);}
