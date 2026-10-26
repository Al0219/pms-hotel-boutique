import { NextRequest } from 'next/server';
import { guestReservationRead } from './proxy';
export const GET = (request: NextRequest) => guestReservationRead(request);
