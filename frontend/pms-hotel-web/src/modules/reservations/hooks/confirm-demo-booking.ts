import type { DemoBookingRequest } from '../model/demo-booking';
import { createDemoBookingDTO } from '../service/demo-booking.service';
import { mapDemoBooking } from '../mappers/demo-booking.mapper';

/** Intentional Domain-only public API for Checkout orchestration. */
export async function confirmDemoBooking(request: DemoBookingRequest, signal: AbortSignal) {
  return mapDemoBooking(await createDemoBookingDTO(request, signal), request);
}
