import type { DemoBookingConfirmation } from '@/modules/reservations';

const escapeText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
function foldLine(line: string) {
  const encoder = new TextEncoder();
  let output = '', length = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (length + size > 75) { output += '\r\n '; length = 1; }
    output += character; length += size;
  }
  return output;
}

/** RFC 5545 all-day stay: departure is exclusive. No inferred hotel check-in time. */
export function confirmationCalendar(confirmation: Pick<DemoBookingConfirmation, 'reservationId' | 'confirmedAt' | 'arrival' | 'departure' | 'stays'>) {
  const stamp = new Date(confirmation.confirmedAt).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hotel Boutique//Checkout Demo//ES', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${escapeText(confirmation.reservationId)}@hotelboutique.example`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${confirmation.arrival.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${confirmation.departure.replace(/-/g, '')}`,
    `SUMMARY:${escapeText(`Hotel Boutique · ${confirmation.reservationId} (demostración)`)}`,
    `DESCRIPTION:${escapeText(`Confirmación ficticia; no existe reserva en el hotel.\n${confirmation.stays.map(stay => stay.roomName).join(', ')}`)}`,
    'CLASS:PRIVATE', 'TRANSP:TRANSPARENT', 'END:VEVENT', 'END:VCALENDAR', '',
  ].map(foldLine).join('\r\n');
}
