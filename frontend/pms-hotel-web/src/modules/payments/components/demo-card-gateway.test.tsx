import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DemoCardGateway } from './demo-card-gateway';

afterEach(cleanup);
describe('Isolated synthetic card gateway', () => {
  it('hides test scenarios in public presentation and restores the actual previous card', () => {
    const change = vi.fn(); const card = { token: 'demo_mastercard_approved', holderName: 'Carlos Mendoza', brand: 'Mastercard' as const, last4: '4444' };
    const view = render(<DemoCardGateway holderName={card.holderName} card={card} onChange={change} disabled={false}/>);
    expect(screen.queryByLabelText('Resultado de demostración')).not.toBeInTheDocument();
    expect(view.container.textContent).not.toMatch(/demostración|simulad|de prueba|fictici/i);
    fireEvent.click(screen.getByRole('button', { name: 'Usar otra tarjeta' }));
    expect(screen.getByTitle('Formulario de tarjeta').getAttribute('srcdoc')).not.toMatch(/de prueba|fictici|simulad/i);
    expect(change).toHaveBeenLastCalledWith(null);
    fireEvent.click(screen.getByRole('button', { name: 'Volver a la tarjeta anterior' }));
    expect(change).toHaveBeenLastCalledWith(card);
  });
  it('exposes only token metadata and rejects messages from another window or with sensitive fields', async () => {
    const change = vi.fn(); const card = { token: 'demo_visa_approved', holderName: 'Carlos Mendoza', brand: 'Visa' as const, last4: '4242' };
    render(<DemoCardGateway holderName={card.holderName} card={card} onChange={change} disabled={false} showTestControls/>);
    expect(screen.getByText('Carlos Mendoza')).toBeInTheDocument(); expect(screen.queryByLabelText('Número de tarjeta')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Usar otra tarjeta/ })); change.mockClear();
    const frame = screen.getByTitle('Formulario de tarjeta') as HTMLIFrameElement;
    expect(frame).toHaveAttribute('sandbox', 'allow-scripts allow-forms'); expect(frame.getAttribute('srcdoc')).toContain("connect-src 'none'"); expect(frame.getAttribute('srcdoc')).toContain("form-action 'none'");
    const channel = screen.getByLabelText('Resultado de demostración').id.replace(/-scenario$/, '');
    function message(source: Window | null, data: object) { fireEvent(window, new MessageEvent('message', { origin: 'null', source, data: { type: 'PMS_DEMO_TOKEN', channel, card: data } })); }
    message(window, card); message(frame.contentWindow, { ...card, cvv: '123' }); expect(change).not.toHaveBeenCalled();
    message(frame.contentWindow, card); await waitFor(() => expect(change).toHaveBeenCalledWith(card)); expect(screen.queryByTitle('Formulario de tarjeta')).not.toBeInTheDocument();
  });
});
