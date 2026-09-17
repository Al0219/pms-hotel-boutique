import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { PublicSearchForm } from './public-search-form';

// Mock next/navigation useRouter
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('PublicSearchForm Component (IMP-WEB-0101)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders form fields with default values', () => {
    render(<PublicSearchForm />);

    expect(screen.getByRole('heading', { name: /reserva tu estancia exclusiva/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha de llegada/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha de salida/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/adultos/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /buscar disponibilidad/i })).toBeInTheDocument();
  });

  it('triggers onSearchSubmitted callback when form is valid', () => {
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
    fireEvent.click(submitBtn);

    expect(handleSubmitted).toHaveBeenCalledWith({
      checkIn: '2026-10-10',
      checkOut: '2026-10-15',
      adults: 2,
      children: 0,
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
      '/habitaciones?checkIn=2026-11-01&checkOut=2026-11-05&adults=2&children=1&promoCode=DESC10'
    );
  });
});
