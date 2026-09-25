import { getServiceAvailabilityHint } from '@/shared/time';

describe('service availability presentation', () => {
  const checkoutAtMs = new Date(2026, 8, 18, 12, 0).getTime();

  it('maps the already-evaluated policy state without defining a new time rule', () => {
    expect(getServiceAvailabilityHint({ effectiveCheckoutAtMs: checkoutAtMs, noAvailability: false, serviceDate: '2026-09-11' })).toMatchObject({ label: '30 min mín.' });
    expect(getServiceAvailabilityHint({ effectiveCheckoutAtMs: checkoutAtMs, noAvailability: false, serviceDate: '2026-09-18' })).toMatchObject({ label: 'Hasta 12:00' });
    expect(getServiceAvailabilityHint({ effectiveCheckoutAtMs: checkoutAtMs, noAvailability: true, serviceDate: '2026-09-18' })).toMatchObject({ label: 'No disponible' });
  });
});
