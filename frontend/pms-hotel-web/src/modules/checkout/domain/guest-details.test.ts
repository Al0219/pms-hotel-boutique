import { describe, expect, it } from 'vitest';
import { emptyGuest, internationalPhone, profileGuestPatch, validateGuest } from './guest-details';
const valid = { ...emptyGuest, firstName: 'María José', lastName: 'Mendoza Pérez', email: 'guest@example.com', phone: '5555 5555' };
describe('Guest contact validation', () => {
  it('accepts international names and optional empty fields', () => { expect(validateGuest(valid)).toEqual({}); });
  it('rejects blanks, invalid contacts, country and overlong requests', () => {
    expect(validateGuest({ ...emptyGuest, country: '', specialRequests: 'a'.repeat(301) })).toMatchObject({ firstName: expect.any(String), lastName: expect.any(String), email: expect.any(String), phone: expect.any(String), country: expect.any(String), specialRequests: expect.any(String) });
    expect(validateGuest({ ...valid, email: 'a@', document: 'a'.repeat(151) })).toHaveProperty('email');
  });
  it('normalizes phone formatting and rejects mismatched prefixes, extensions and excessive length', () => {
    expect(internationalPhone(valid)).toBe('+50255555555');
    expect(internationalPhone({ phoneCode: '+502', phone: '+502 (5555) 5555' })).toBe('+50255555555');
    expect(internationalPhone({ phoneCode: '+502', phone: '+525555555555' })).toBeNull();
    expect(internationalPhone({ phoneCode: '+502', phone: '55555555 ext 1' })).toBeNull();
    expect(internationalPhone({ phoneCode: '+1', phone: '1'.repeat(15) })).toBeNull();
    expect(validateGuest({ ...valid, phoneCode: '+91', phone: '9876543210' })).toEqual({});
  });
  it('prefills only empty fields with profile contact', () => {
    const profile = { firstName: 'Alan', lastName: 'Palacios', email: 'contact@example.com', phone: '+50255555555', country: 'Guatemala' };
    expect(profileGuestPatch(profile, { ...emptyGuest, firstName: 'Manual', email: 'manual@example.com', phone: '12345678' })).toEqual({ lastName: 'Palacios' });
    expect(profileGuestPatch(profile, emptyGuest)).toMatchObject({ firstName: 'Alan', email: 'contact@example.com', phoneCode: '+502', phone: '55555555' });
  });
});
