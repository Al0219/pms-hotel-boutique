import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FaqChatbot } from './faq-chatbot';

describe('FaqChatbot component', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn());
  });

  it('toggles chat window when clicking floating toggle button', () => {
    render(<FaqChatbot />);
    const toggle = screen.getByRole('button', { name: /Abrir chat de atención/i });
    expect(toggle).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByRole('dialog', { name: /Asistente Virtual Hotel Boutique/i })).toBeInTheDocument();
    expect(screen.getByText(/Hotel Boutique Concierge/i)).toBeInTheDocument();

    // Close button
    const close = screen.getByRole('button', { name: 'Cerrar chat' });
    fireEvent.click(close);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays quick FAQ options and appends answers when clicked', () => {
    render(<FaqChatbot />);
    fireEvent.click(screen.getByRole('button', { name: /Abrir chat de atención/i }));

    const checkInFaq = screen.getByRole('button', { name: '¿Cuáles son los horarios de Check-in y Check-out?' });
    fireEvent.click(checkInFaq);
    expect(screen.getByText('Check-in a partir de las 15:00 hrs y Check-out hasta las 11:00 hrs.')).toBeInTheDocument();

    const amenitiesFaq = screen.getByRole('button', { name: '¿Qué amenidades incluyen las habitaciones?' });
    fireEvent.click(amenitiesFaq);
    expect(screen.getByText(/Wi-Fi de alta velocidad, desayuno artesanal incluido/i)).toBeInTheDocument();

    const cancellationFaq = screen.getByRole('button', { name: '¿Cuáles son las políticas de cancelación?' });
    fireEvent.click(cancellationFaq);
    expect(screen.getByText('Cancelación gratuita hasta 48 horas antes de la fecha de llegada.')).toBeInTheDocument();

    const paymentFaq = screen.getByRole('button', { name: '¿Cuáles son los métodos de pago?' });
    fireEvent.click(paymentFaq);
    expect(screen.getByText(/Tarjetas de crédito\/débito \(Visa, MasterCard\)/i)).toBeInTheDocument();
  });

  it('redirects to WhatsApp when selecting "Hablar con recepción"', () => {
    render(<FaqChatbot />);
    fireEvent.click(screen.getByRole('button', { name: /Abrir chat de atención/i }));

    const receptionFaq = screen.getByRole('button', { name: 'Hablar con recepción' });
    fireEvent.click(receptionFaq);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/'),
      '_blank',
      'noopener,noreferrer'
    );
  });
});
