import { describe, expect, it } from 'vitest';
import { confirmationCalendar } from './confirmation-calendar';

const confirmation = { reservationId: 'HB-2026-8942', confirmedAt: '2026-10-05T12:00:00.000Z', arrival: '2026-10-10', departure: '2026-10-13', stays: [{ id: 'stay-1', roomTypeId: 'king', ratePlanId: 'flex', roomName: 'Deluxe King' }] };
describe('Confirmation calendar export', () => {
  it('exports a private all-day stay with an exclusive departure, stable UID and UTC timestamp', () => {
    const result = confirmationCalendar(confirmation);
    expect(result).toContain('DTSTART;VALUE=DATE:20261010\r\nDTEND;VALUE=DATE:20261013'); expect(result).toContain('DTSTAMP:20261005T120000Z'); expect(result).toContain('UID:HB-2026-8942@hotelboutique.example'); expect(result).toContain('CLASS:PRIVATE'); expect(result).toContain('demostración'); expect(result).not.toContain('ATTENDEE'); expect(result).not.toContain('ORGANIZER');
  });
  it('escapes calendar text and folds UTF-8 lines without splitting characters or injecting fields', () => {
    const roomName = 'Habitación 🛏️ '.repeat(20) + ', terraza; jardín\\vista\r\nATTENDEE:intruder@example.com';
    const result = confirmationCalendar({ ...confirmation, stays: [{ ...confirmation.stays[0], roomName }] });
    for (const line of result.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    const unfolded = result.replace(/\r\n /g, ''); expect(unfolded).toContain('\\, terraza\\; jardín\\\\vista\\nATTENDEE:'); expect(unfolded).not.toContain('\r\nATTENDEE:'); expect(unfolded).not.toContain('�'); expect(unfolded).toContain('Habitación 🛏️ '.repeat(20));
  });
});
