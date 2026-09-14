import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Button } from './button';

describe('Button Component (IMP-WEB-S101)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders children correctly', () => {
    render(<Button>Buscar disponibilidad</Button>);
    expect(screen.getByRole('button', { name: /buscar disponibilidad/i })).toBeInTheDocument();
  });

  it('handles click events when enabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Reservar</Button>);

    fireEvent.click(screen.getByRole('button', { name: /reservar/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onClick when disabled', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Deshabilitado</Button>);

    const button = screen.getByRole('button', { name: /deshabilitado/i });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders loading state correctly with aria-busy', () => {
    render(<Button isLoading loadingText="Cargando...">Enviar</Button>);

    const button = screen.getByRole('button', { name: /cargando/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('applies variant and size classes', () => {
    const { container } = render(<Button variant="secondary" size="lg">Secundario</Button>);
    expect(container.firstChild).toHaveClass(/variantSecondary/);
    expect(container.firstChild).toHaveClass(/sizeLg/);
  });
});
