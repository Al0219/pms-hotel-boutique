import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { staffReservationDetailsFixture, staffReservationFixture } from '../staff-reservation.fixture';
import { mapStaffReservationDetail } from '../mappers/staff-reservation.mapper';
import { StaffReservationOverview } from './staff-reservation-overview';
afterEach(cleanup);

it('keeps contact and notes collapsed, expands real contact and preserves protected documents', () => {
  const detail = mapStaffReservationDetail(staffReservationDetailsFixture());
  render(<StaffReservationOverview detail={detail} renderStay={stay => <p>{stay.roomType}</p>} />);
  expect(screen.getByText('Responsable de la reserva').closest('details')).not.toHaveAttribute('open');
  expect(screen.getByText('responsible@example.test')).not.toBeVisible();
  expect(screen.getByText(detail.notes!)).not.toBeVisible();
  fireEvent.click(screen.getByText('Responsable de la reserva'));
  expect(screen.getByText('responsible@example.test')).toBeVisible();
  expect(screen.getByText('+502 5555 5555')).toBeVisible(); expect(screen.getByText('•••• 0123')).toBeVisible();
  expect(screen.getByText('Guatemala')).toBeVisible();
  expect(screen.queryByText('1234567890123')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Notas y referencias')); expect(screen.getByText(detail.notes!)).toBeVisible();
  expect(screen.getByText(detail.id)).toBeVisible();
});

it('shows all stays with independent occupants and opens the shared carousel only on demand', async () => {
  const dto = staffReservationDetailsFixture();
  dto.stays.push({ ...dto.stays[0], stayId: dto.reservationId, arrival: '2026-11-02', departure: '2026-11-05',
    room: { roomId: dto.propertyId, code: '204' } });
  dto.details!.stays.push({ stayId: dto.reservationId, occupants: [] });
  render(<StaffReservationOverview detail={mapStaffReservationDetail(dto)} renderStay={stay => <p>{stay.roomLabel ?? 'Sin asignar'} · {stay.nights} noches</p>} />);
  expect(screen.getByText('Sin asignar · 2 noches')).toBeVisible(); expect(screen.getByText('204 · 3 noches')).toBeVisible();
  expect(screen.queryByRole('region', { name: 'Fotografías de Deluxe' })).not.toBeInTheDocument();
  const disclosure = screen.getByLabelText('Ver habitación y ocupantes: Deluxe'); fireEvent.click(disclosure);
  const gallery = await screen.findByRole('region', { name: 'Fotografías de Deluxe' });
  fireEvent.click(within(gallery).getByRole('button', { name: 'Fotografía siguiente' }));
  expect(within(gallery).getByRole('button', { name: 'Ver fotografía 2' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Actual Occupant')).toBeVisible();
  fireEvent.click(screen.getByLabelText('Ver habitación y ocupantes: 204'));
  expect(screen.getByText('No se han registrado ocupantes para esta estadía.')).toBeVisible();
});

it('renders an empty historical header and clearly marks data unavailable in an older backend', () => {
  const dto = staffReservationFixture(); dto.stays = []; dto.responsibleGuest = null;
  render(<StaffReservationOverview detail={mapStaffReservationDetail(dto)} renderStay={() => null} />);
  expect(screen.getByText('Sin estadías registradas.')).toBeVisible();
  fireEvent.click(screen.getByText('Responsable de la reserva'));
  expect(screen.getByText('Información de contacto adicional no disponible.')).toBeVisible();
  expect(screen.queryByText(/adultos|Pagado|Capturado/)).not.toBeInTheDocument();
});

it('shows an explicit empty photo state for a type with no associated catalogue content', async () => {
  const dto = staffReservationDetailsFixture(); dto.stays[0].roomType.code = 'UNKNOWN';
  render(<StaffReservationOverview detail={mapStaffReservationDetail(dto)} renderStay={stay => <p>{stay.roomType}</p>} />);
  fireEvent.click(screen.getByLabelText('Ver habitación y ocupantes: Deluxe'));
  expect(screen.queryByRole('region', { name: 'Fotografías de Deluxe' })).not.toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(await screen.findByText('No hay fotografías disponibles para este tipo de habitación.')).toBeVisible();
});
