import { describe, expect, it } from 'vitest';
import { publicHomeCatalogueHref } from './public-room-navigation';

describe('Home catalogue navigation', () => {
  it('targets the stable Home anchor without criteria', () => {
    expect(publicHomeCatalogueHref({})).toBe('/#habitaciones');
  });
  it('preserves all valid search criteria, not the results route', () => {
    const href = publicHomeCatalogueHref({ checkIn: '2026-11-01', checkOut: '2026-11-03', adults: 3, children: 2, roomsCount: 2 });
    expect(href).toBe('/?checkIn=2026-11-01&checkOut=2026-11-03&adults=3&children=2&roomsCount=2#habitaciones');
    expect(href).not.toContain('/habitaciones');
  });
  it('does not forward invalid or partial criteria', () => {
    expect(publicHomeCatalogueHref({ checkIn: 'invalid', adults: 0 })).toBe('/#habitaciones');
  });
});
