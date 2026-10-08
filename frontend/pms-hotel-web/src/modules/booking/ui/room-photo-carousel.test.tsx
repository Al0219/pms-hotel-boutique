import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mapPublicAvailabilityToDomain } from '@/modules/availability';
import { backendAvailability } from '@/test/public-availability-fixture';
import { RoomPhotoCarousel } from './room-photo-carousel';
describe('Licensed room photo carousel', () => {
  it('navigates a code gallery by buttons and keyboard without visible licensing copy', () => {
    const metadata=mapPublicAvailabilityToDomain({...backendAvailability,offers:[{...backendAvailability.offers[0],roomTypeCode:'STD'}]}).roomTypes[0];
    render(<RoomPhotoCarousel images={metadata.images} name="Habitación Estándar"  />);
    expect(screen.getByText('1 / 3')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button',{name:'Fotografía siguiente'})); expect(screen.getByText('2 / 3')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('region',{name:'Fotografías de Habitación Estándar'}).firstElementChild!,{key:'ArrowLeft'}); expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.queryByText(/Créditos|ilustrativas/)).not.toBeInTheDocument();
  });
  it('falls back safely when a code has no photos or a download fails', () => {
    const view=render(<RoomPhotoCarousel images={[]} name="Sin fotos" />); expect(screen.getByText('Fotografías próximamente')).toBeInTheDocument();
    view.rerender(<RoomPhotoCarousel images={['/missing.jpg']} name="Sin fotos" />); fireEvent.error(screen.getByRole('img')); expect(screen.getByText('Fotografía no disponible')).toBeInTheDocument();
  });
});
