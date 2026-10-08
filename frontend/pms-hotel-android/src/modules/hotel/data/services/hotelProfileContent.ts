import { hotelProfileFixture } from '@/modules/hotel/data/mocks/hotelProfileFixture';
import { type HotelProfile } from '@/modules/hotel/domain/HotelProfile';

/** Synchronous boundary for the approved demo profile; it has no remote dependency. */
export function getHotelProfile(): HotelProfile {
  return hotelProfileFixture;
}
