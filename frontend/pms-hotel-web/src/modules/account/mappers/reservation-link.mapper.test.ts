import { describe, expect, it } from 'vitest';
import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
import { mapLinkChallenge, mapLinkResult } from './reservation-link.mapper';
import { otpError, referenceError } from '../model/reservation-link';
describe('Reservation link boundaries', () => {
  it('validates references and numeric verification codes', () => {
    expect(referenceError(' ')).toBeTruthy(); expect(referenceError('x'.repeat(17))).toBeTruthy(); expect(referenceError('HB-2026-10420')).toBeUndefined();
    expect(otpError('12abcd78')).toBeTruthy(); expect(otpError('12345678')).toBeUndefined();
  });
  it('maps domain values and rejects foreign account/request responses', () => {
    const challenge = { account_id: 'account', request_id: 'request', expires_at: '2026-10-05T12:05:00.000Z' };
    expect(mapLinkChallenge(challenge, 'account')).toEqual({ id: 'request', expiresAt: challenge.expires_at });
    expect(() => mapLinkChallenge(challenge, 'other')).toThrow(DomainMappingError);
    expect(() => mapLinkChallenge({ ...challenge, expires_at: 'bad' }, 'account')).toThrow(DomainMappingError);
    expect(() => mapLinkChallenge(null!, 'account')).toThrow(DomainMappingError);
    const result = { account_id: 'account', request_id: 'request', reservation_id: 'HB-2026-10420' };
    expect(mapLinkResult(result, 'account', 'request')).toEqual({ reservationId: result.reservation_id });
    expect(() => mapLinkResult(result, 'account', 'other-request')).toThrow(DomainMappingError);
  });
});
