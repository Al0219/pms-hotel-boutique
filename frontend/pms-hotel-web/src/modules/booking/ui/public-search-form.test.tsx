import React from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { act, render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PublicSearchForm } from './public-search-form';

// Mock next/navigation useRouter
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('PublicSearchForm Component (IMP-WEB-0101)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-04T12:00:00Z'));
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('renders form fields with default values', () => {
    render(<PublicSearchForm />);

    expect(screen.getByRole('heading', { name: /reserva tu estancia exclusiva/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha de llegada/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha de salida/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/adultos/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^habitaciones/i)).toHaveValue(1);
    expect(screen.getByRole('button', { name: /buscar disponibilidad/i })).toBeInTheDocument();
  });

  it('restores initial criteria without overwriting the requested dates or occupancy', () => {
    render(<PublicSearchForm initialCriteria={{
      checkIn: '2026-10-10', checkOut: '2026-10-15', adults: 4, children: 1, roomsCount: 2,
    }} />);
    expect(screen.getByLabelText(/fecha de llegada/i)).toHaveValue('2026-10-10');
    expect(screen.getByLabelText(/fecha de salida/i)).toHaveValue('2026-10-15');
    expect(screen.getByLabelText(/^adultos/i)).toHaveValue(4);
    expect(screen.getByLabelText(/^habitaciones/i)).toHaveValue(2);
  });

  it('triggers onSearchSubmitted callback when form is valid', async () => {
    const handleSubmitted = vi.fn();
    render(
      <PublicSearchForm
        initialCriteria={{
          checkIn: '2026-10-10',
          checkOut: '2026-10-15',
          adults: 2,
          children: 0,
        }}
        onSearchSubmitted={handleSubmitted}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /buscar disponibilidad/i });
    await act(async () => { fireEvent.click(submitBtn); });

    expect(handleSubmitted).toHaveBeenCalledWith({
      checkIn: '2026-10-10',
      checkOut: '2026-10-15',
      adults: 2,
      children: 0,
      roomsCount: 1,
      promoCode: '',
    });
  });

  it('shows error message if checkOut is before checkIn', () => {
    render(
      <PublicSearchForm
        initialCriteria={{
          checkIn: '2026-10-15',
          checkOut: '2026-10-10',
          adults: 2,
        }}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /buscar disponibilidad/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('La fecha de salida debe ser posterior a la de llegada')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('navigates to /habitaciones with search query params when submitted without custom callback', () => {
    render(
      <PublicSearchForm
        initialCriteria={{
          checkIn: '2026-11-01',
          checkOut: '2026-11-05',
          adults: 2,
          children: 1,
          promoCode: 'DESC10',
        }}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /buscar disponibilidad/i });
    fireEvent.click(submitBtn);

    expect(mockPush).toHaveBeenCalledWith(
      '/habitaciones?checkIn=2026-11-01&checkOut=2026-11-05&adults=2&children=1&roomsCount=1&promoCode=DESC10'
    );
  });

  it('submits the selected room count without changing other criteria', async () => {
    const submitted = vi.fn();
    render(<PublicSearchForm onSearchSubmitted={submitted} />);
    fireEvent.change(screen.getByLabelText(/^habitaciones/i), { target: { value: '3' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /buscar disponibilidad/i })); });
    expect(submitted).toHaveBeenCalledWith(expect.objectContaining({ roomsCount: 3, adults: 2, children: 0 }));
  });

  it('rejects an empty room count and focuses its field', () => {
    render(<PublicSearchForm />);
    const rooms = screen.getByLabelText(/^habitaciones/i);
    fireEvent.change(rooms, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /buscar disponibilidad/i }));
    expect(screen.getByText(/indica al menos una habitación/i)).toBeInTheDocument();
    expect(rooms).toHaveFocus();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not truncate fractional occupancy into an accepted integer', () => {
    render(<PublicSearchForm />);
    fireEvent.change(screen.getByLabelText(/^adultos/i), { target: { value: '1.5' } });
    fireEvent.click(screen.getByRole('button', { name: /buscar disponibilidad/i }));
    expect(screen.getByLabelText(/^adultos/i)).toHaveAttribute('aria-invalid', 'true');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('blocks repeated submission and changes to criteria while awaiting a search', async () => {
    let finish!: () => void;
    const submitted = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    render(<PublicSearchForm onSearchSubmitted={submitted} />);
    const form = screen.getByRole('form', { name: /búsqueda de disponibilidad/i });
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(submitted).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/^habitaciones/i)).toBeDisabled();
    expect(screen.getByLabelText(/código promocional/i)).toBeDisabled();
    await act(async () => { finish(); });
    expect(screen.getByRole('button', { name: /buscar disponibilidad/i })).toBeEnabled();
  });

  it('preserves criteria after failure and allows a successful retry', async () => {
    const submitted = vi.fn().mockRejectedValueOnce(new Error('internal detail')).mockResolvedValueOnce(undefined);
    render(<PublicSearchForm initialCriteria={{ roomsCount: 2, promoCode: 'BOUTIQUE' }} onSearchSubmitted={submitted} />);
    fireEvent.click(screen.getByRole('button', { name: /buscar disponibilidad/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/conservamos tus datos/i));
    expect(screen.getByLabelText(/^habitaciones/i)).toHaveValue(2);
    expect(screen.getByLabelText(/código promocional/i)).toHaveValue('BOUTIQUE');
    fireEvent.click(screen.getByRole('button', { name: /buscar disponibilidad/i }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(submitted).toHaveBeenCalledTimes(2);
  });

  it('uses a supplied property calendar date rather than the UTC date', () => {
    vi.setSystemTime(new Date('2026-10-04T02:30:00Z'));
    render(<PublicSearchForm propertyTimeZone="America/Guatemala" />);
    expect(screen.getByLabelText(/fecha de llegada/i)).toHaveValue('2026-10-03');
    expect(screen.getByLabelText(/fecha de salida/i)).toHaveValue('2026-10-04');
  });

  it('hydrates with the current day even when the server rendered on a previous day', async () => {
    const html = renderToString(<PublicSearchForm propertyTimeZone="UTC" />);
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.append(container);
    expect(container.querySelector<HTMLInputElement>('#search-check-in')?.value).toBe('');
    vi.setSystemTime(new Date('2026-10-05T12:00:00Z'));
    const errors = vi.spyOn(console, 'error');
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => { root = hydrateRoot(container, <PublicSearchForm propertyTimeZone="UTC" />); });
      expect(container.querySelector<HTMLInputElement>('#search-check-in')?.value).toBe('2026-10-05');
      expect(container.querySelector<HTMLInputElement>('#search-check-out')?.value).toBe('2026-10-06');
      expect(errors).not.toHaveBeenCalled();
    } finally {
      await act(async () => { root?.unmount(); });
      container.remove();
      errors.mockRestore();
    }
  });
});
