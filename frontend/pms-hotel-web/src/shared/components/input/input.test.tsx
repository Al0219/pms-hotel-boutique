import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Input } from './input';

describe('Input Component (IMP-WEB-S102)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders input with label connected via id', () => {
    render(<Input label="Fecha de Llegada" placeholder="YYYY-MM-DD" />);
    
    const input = screen.getByLabelText(/fecha de llegada/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'YYYY-MM-DD');
  });

  it('renders required indicator when isRequired is true', () => {
    render(<Input label="Huéspedes" isRequired />);
    
    expect(screen.getByText('*')).toBeInTheDocument();
    const input = screen.getByLabelText(/huéspedes/i);
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('renders helper text when provided', () => {
    render(<Input label="Código Promo" helperText="Ingresa el código si tienes uno" />);
    
    expect(screen.getByText('Ingresa el código si tienes uno')).toBeInTheDocument();
  });

  it('renders error message and sets aria-invalid', () => {
    render(
      <Input
        label="Fecha de Salida"
        errorMessage="La fecha de salida debe ser posterior a la de llegada"
      />
    );
    
    const input = screen.getByLabelText(/fecha de salida/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const errorEl = screen.getByRole('alert');
    expect(errorEl).toHaveTextContent('La fecha de salida debe ser posterior a la de llegada');
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Input label="Nombre" onChange={handleChange} />);
    
    const input = screen.getByLabelText(/nombre/i);
    fireEvent.change(input, { target: { value: 'Carlos' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('disables input when disabled prop is true', () => {
    render(<Input label="Campo bloqueado" disabled />);
    
    const input = screen.getByLabelText(/campo bloqueado/i);
    expect(input).toBeDisabled();
  });
});
