import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { WhatsAppButton } from './whatsapp-button';

describe('WhatsAppButton component', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders with fallback phone number and correct WhatsApp link', () => {
    render(<WhatsAppButton />);
    const link = screen.getByRole('link', { name: /Contactar por WhatsApp/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link.getAttribute('href')).toContain('https://wa.me/');
    expect(link.getAttribute('href')).toContain('Hola%2C%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20sobre%20disponibilidad%20y%20reservas%20en%20Hotel%20Boutique');
  });

  it('uses NEXT_PUBLIC_WHATSAPP_NUMBER when provided', () => {
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_NUMBER', '50299887766');
    render(<WhatsAppButton />);
    const link = screen.getByRole('link', { name: /Contactar por WhatsApp/i });
    expect(link.getAttribute('href')).toContain('https://wa.me/50299887766');
  });
});
