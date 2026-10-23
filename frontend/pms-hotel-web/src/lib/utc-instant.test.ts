import { describe, expect, it } from 'vitest';
import { isUtcInstant } from './utc-instant';
describe('exact UTC API token', () => {
  it.each(['2026-10-22T19:00:00Z', '2026-10-22T19:00:00.123456Z', '2026-10-22T19:00:00.123456789Z'])('accepts %s without altering it', value => {
    expect(isUtcInstant(value)).toBe(true);
  });
  it.each([null, undefined, '', '2026-02-30T00:00:00Z', '2026-13-01T00:00:00Z', '2026-10-22T25:00:00Z',
    '2026-10-22T19:00:00+00:00', '2026-10-22T19:00:00.1234567890Z'])('rejects malformed UTC %s', value => {
    expect(isUtcInstant(value)).toBe(false);
  });
});
