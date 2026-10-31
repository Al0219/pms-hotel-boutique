import { GET as availabilityGet } from '../v1/public/availability/route';
import { getPublicEnvironment } from '@/lib/env';

export async function GET(request: Request) {
  const mappedUrl = new URL(request.url);
  const propertyId = mappedUrl.searchParams.get('propertyId')
    || mappedUrl.searchParams.get('property_id')
    || process.env.NEXT_PUBLIC_PROPERTY_ID;
  if (propertyId) mappedUrl.searchParams.set('propertyId', propertyId);

  const checkIn = mappedUrl.searchParams.get('checkIn');
  if (checkIn && !mappedUrl.searchParams.has('arrival')) {
    mappedUrl.searchParams.set('arrival', checkIn);
  }

  const checkOut = mappedUrl.searchParams.get('checkOut');
  if (checkOut && !mappedUrl.searchParams.has('departure')) {
    mappedUrl.searchParams.set('departure', checkOut);
  }

  const roomsCount = mappedUrl.searchParams.get('roomsCount') || mappedUrl.searchParams.get('rooms');
  if (roomsCount) {
    mappedUrl.searchParams.set('rooms', roomsCount);
  }

  return availabilityGet(new Request(mappedUrl.toString(), {
    headers: request.headers,
    signal: request.signal,
  }));
}
