import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { mapPublicAvailabilityToDomain } from '@/modules/availability';
import { backendAvailability } from '@/test/public-availability-fixture';
import { catalogueOptions, clearCatalogueFilters } from '../domain/room-catalogue';
import { NightlyPriceRange } from './nightly-price-range';
const rooms = mapPublicAvailabilityToDomain({ ...backendAvailability, offers: [backendAvailability.offers[0], { ...backendAvailability.offers[0], roomTypeId: '42ec66c1-2d0b-40e5-bccf-a6dc3acfe1d6', nightlyRateMinor: 43210, totalMinor: 87654 }] }).roomTypes;
function Harness() { const [filters, setFilters] = useState(clearCatalogueFilters); return <><NightlyPriceRange rooms={rooms} filters={filters} onChange={setFilters} /><output>{catalogueOptions(rooms, {}, filters, 'price-asc').length}</output><button onClick={() => setFilters(clearCatalogueFilters())}>Restablecer</button></>; }
describe('Accessible two-handle nightly price range', () => {
  it('derives bounds from the response, filters both ends and resets without changing source', () => {
    const snapshot = structuredClone(rooms); render(<Harness />);
    const min = screen.getByRole('slider', { name: 'Precio mínimo por noche' }), max = screen.getByRole('slider', { name: 'Precio máximo por noche' });
    expect(min).toHaveAttribute('min', '43210'); expect(max).toHaveAttribute('max', '85000'); expect(min).toHaveAttribute('aria-valuetext', 'Q 432.10'); expect(max).toHaveAttribute('aria-valuetext', 'Q 850.00');
    fireEvent.change(min, { target: { value: '50000' } }); expect(screen.getByRole('status')).toHaveTextContent('1');
    fireEvent.change(max, { target: { value: '49000' } }); expect(max).toHaveValue('50000'); expect(screen.getByRole('status')).toHaveTextContent('0');
    min.focus(); expect(min).toHaveFocus(); expect(min).toHaveAttribute('type', 'range');
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' })); expect(min).toHaveValue('43210'); expect(max).toHaveValue('85000'); expect(screen.getByRole('status')).toHaveTextContent('2'); expect(rooms).toEqual(snapshot);
  });
  it('disables both handles for a single quoted price and safely handles empty offers', () => {
    const view = render(<NightlyPriceRange rooms={[rooms[0]]} filters={clearCatalogueFilters()} onChange={() => {}} />);
    expect(screen.getAllByRole('slider').every(input => input.hasAttribute('disabled'))).toBe(true);
    view.rerender(<NightlyPriceRange rooms={[]} filters={clearCatalogueFilters()} onChange={() => {}} />); expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });
});
