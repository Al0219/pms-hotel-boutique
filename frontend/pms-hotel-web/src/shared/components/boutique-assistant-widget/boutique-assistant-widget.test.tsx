import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { BoutiqueAssistantWidget } from './boutique-assistant-widget';

function renderWithRoute(path: string | null) {
  return render(
    <PathnameContext.Provider value={path}>
      <BoutiqueAssistantWidget />
    </PathnameContext.Provider>
  );
}

describe('BoutiqueAssistantWidget', () => {
  it('renders floating buttons on landing page (/)', () => {
    const { container } = renderWithRoute('/');
    expect(container.querySelector('[aria-label="Atención al cliente y mensajería"]')).toBeInTheDocument();
    expect(screen.getByLabelText('Contactar por WhatsApp')).toBeInTheDocument();
  });

  it('renders floating buttons on public booking routes (/reserva)', () => {
    const { container } = renderWithRoute('/reserva');
    expect(container.querySelector('[aria-label="Atención al cliente y mensajería"]')).toBeInTheDocument();
  });

  it('renders floating buttons on public room routes (/habitaciones)', () => {
    const { container } = renderWithRoute('/habitaciones');
    expect(container.querySelector('[aria-label="Atención al cliente y mensajería"]')).toBeInTheDocument();
  });

  it('returns null (hides buttons) on /dashboard', () => {
    const { container } = renderWithRoute('/dashboard');
    expect(container.firstChild).toBeNull();
  });

  it('returns null (hides buttons) on /staff routes', () => {
    const { container } = renderWithRoute('/staff/habitaciones');
    expect(container.firstChild).toBeNull();
  });

  it('returns null (hides buttons) on /admin routes', () => {
    const { container } = renderWithRoute('/admin');
    expect(container.firstChild).toBeNull();
  });

  it('returns null (hides buttons) on private operations routes like /reservas', () => {
    const { container } = renderWithRoute('/reservas');
    expect(container.firstChild).toBeNull();
  });

  it('returns null when pathname is null', () => {
    const { container } = renderWithRoute(null);
    expect(container.firstChild).toBeNull();
  });
});
