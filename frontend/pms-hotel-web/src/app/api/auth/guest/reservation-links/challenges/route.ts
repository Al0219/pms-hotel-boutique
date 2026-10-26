import { NextRequest } from 'next/server';
import { guestReservationLink } from '../proxy';
export const POST = (request: NextRequest) => guestReservationLink(request, false);
