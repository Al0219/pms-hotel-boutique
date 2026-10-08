import { describe, expect, it } from 'vitest';
import { emptyGuest, internationalPhone, normalizeGuest, profileGuestPatch, validateGuest } from './guest-details';
const valid = { ...emptyGuest, firstName: 'María José', lastName: "O’Neill-Pérez", email: 'guest@example.com', phone: '55555555', document: 'DOC-1234' };
describe('Guest contact validation', () => {
  it('accepts Unicode names and normalizes contact without changing other fields', () => {
    expect(validateGuest(valid)).toEqual({});
    expect(normalizeGuest({ ...valid, firstName: ' María José ', lastName: ' Pérez ', email: ' GUEST@EXAMPLE.COM ', document: ' DOC-1234 ' })).toMatchObject({ firstName: 'María José', lastName: 'Pérez', email: 'guest@example.com', document: 'DOC-1234' });
  });
  it.each(['', 'A', 'Ana123', '--', 'A'.repeat(81), 'Ana@example'])('rejects invalid name and surname %s', name => {
    expect(validateGuest({ ...valid, firstName: name, lastName: name })).toMatchObject({ firstName: expect.any(String), lastName: expect.any(String) });
  });
  it.each(['a@', 'a b@example.com', ''])('rejects invalid email %s', email => { expect(validateGuest({ ...valid, email })).toHaveProperty('email'); });
  it.each(['5555555', '555555555', '5555abcd', '5555 5555'])('requires exactly 8 local digits for +502: %s', phone => {
    expect(validateGuest({ ...valid, phone })).toHaveProperty('phone'); expect(internationalPhone({ phoneCode: '+502', phone })).toBeNull();
  });
  it('accepts international 7..15 local digits and rejects other lengths', () => {
    expect(internationalPhone(valid)).toBe('+50255555555');
    for (const length of [7, 15]) expect(validateGuest({ ...valid, phoneCode: '+91', phone: '1'.repeat(length) })).toEqual({});
    for (const length of [6, 16]) expect(validateGuest({ ...valid, phoneCode: '+91', phone: '1'.repeat(length) })).toHaveProperty('phone');
  });
  it.each(['', '   ', '123', 'a'.repeat(26), 'DOC 123', 'DOC/123'])('requires a 4..25 alphanumeric/hyphen document: %s', document => {
    expect(validateGuest({ ...valid, document })).toHaveProperty('document');
  });
  it('requires country and limits requests to 250', () => {
    expect(validateGuest({ ...valid, country: '', specialRequests: 'a'.repeat(251) })).toMatchObject({ country: expect.any(String), specialRequests: expect.any(String) });
    expect(validateGuest({ ...valid, specialRequests: 'a'.repeat(250) })).toEqual({});
  });
  it('prefills only empty profile contact and never copies identity document', () => {
    const profile = { firstName: 'Alan', lastName: 'Palacios', email: 'contact@example.com', phone: '+50255555555', country: 'Guatemala' };
    expect(profileGuestPatch(profile, { ...emptyGuest, firstName: 'Manual', email: 'manual@example.com', phone: '12345678' })).toEqual({ lastName: 'Palacios' });
    expect(profileGuestPatch(profile, emptyGuest)).toMatchObject({ firstName: 'Alan', email: 'contact@example.com', phoneCode: '+502', phone: '55555555' });
    expect(profileGuestPatch(profile, emptyGuest)).not.toHaveProperty('document');
  });
});

it('enforces every new maximum at its exact boundary', () => {
  const email = 'a'.repeat(60) + '@' + 'b'.repeat(55) + '.com';
  const boundary = { ...valid, firstName: 'a'.repeat(50), lastName: 'b'.repeat(60), email, document: 'a'.repeat(25), specialRequests: 'r'.repeat(250) };
  expect(email.length).toBe(120); expect(validateGuest(boundary)).toEqual({});
  expect(validateGuest({ ...boundary, firstName: boundary.firstName+'a', lastName: boundary.lastName+'b', email: 'a'+email, document: boundary.document+'x', specialRequests: boundary.specialRequests+'r' })).toMatchObject({ firstName: expect.any(String), lastName: expect.any(String), email: expect.any(String), document: expect.any(String), specialRequests: expect.any(String) });
});
