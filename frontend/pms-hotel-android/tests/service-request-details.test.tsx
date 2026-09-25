import { fireEvent, render } from '@testing-library/react-native';

import { canCancelLateCheckoutRequest, getLateCheckoutCancellationCutoffMs, SessionServiceRequestCard, type SessionServiceRequest } from '@/modules/service-requests';

declare const require: (moduleName: string) => { readFileSync(path: string, encoding: string): string };

describe('Completed service details and Late check-out cancellation', () => {
  it('keeps Chat editor actions on dedicated accessible styles', () => {
    const fs = require('fs');
    const screen = fs.readFileSync('src/modules/service-requests/presentation/SessionServiceRequestsScreen.tsx', 'utf8');
    const styles = fs.readFileSync('src/modules/service-requests/presentation/sessionServiceRequestStyles.ts', 'utf8');
    expect(screen).toContain('styles.editorButtonPrimary');
    expect(screen).toContain('styles.editorButtonSecondary');
    expect(screen).not.toContain('style={styles.backButton} testID="session-service-request-editor-save"');
    expect(screen).toContain('accessibilityRole="button" onPress={saveEditor}');
    expect(screen).toContain('accessibilityRole="button" onPress={closeEditor}');
    expect(styles).toContain('editorActions');
    expect(styles).toContain('minHeight: tokens.layout.buttonHeight');
  });
  it('opens a read-only completed request without edit, removal, or completion controls', async () => {
    const request: SessionServiceRequest = { sessionRequestId: 'done-room', kind: 'ROOM_SERVICE', origin: 'SERVICES', title: 'Room Service', summary: 'Pedido', status: 'COMPLETED', createdAtMs: 1, details: { type: 'ROOM_SERVICE', serviceDate: '2026-09-11', deliveryTime: '13:00', items: [{ itemFixtureKey: 'coffee', quantity: 2 }], notes: 'Sin azúcar' }, billingSnapshot: { label: 'Room Service', priceText: 'Q 40', lineItems: [{ label: 'Café', quantity: 2, priceText: 'Q 20' }] } };
    const ui = await render(<SessionServiceRequestCard onComplete={jest.fn()} onEdit={jest.fn()} onRemove={jest.fn()} request={request} />);
    expect(ui.queryByLabelText('Editar Room Service')).toBeNull();
    expect(ui.queryByLabelText('Marcar Room Service como completado')).toBeNull();
    await fireEvent.press(ui.getByLabelText('Ver detalles de Room Service'));
    expect(ui.getByText('Estado: Completado')).toBeTruthy();
    expect(ui.getByText('Café × 2')).toBeTruthy();
    await fireEvent.press(ui.getByTestId('session-service-request-details-close-done-room'));
    expect(ui.queryByTestId('session-service-request-details-done-room')).toBeNull();
  });

  it('derives Late check-out cancellation from normal checkout minus thirty minutes', () => {
    const request: SessionServiceRequest = { sessionRequestId: 'late', kind: 'LATE_CHECKOUT', origin: 'SERVICES', title: 'Late check-out', status: 'REQUESTED', createdAtMs: 1, details: { type: 'LATE_CHECKOUT', serviceDate: '2026-09-18', checkoutUntil: '14:00' } };
    expect(getLateCheckoutCancellationCutoffMs('2026-09-18')).toBe(new Date(2026, 8, 18, 11, 30).getTime());
    expect(canCancelLateCheckoutRequest(request, new Date(2026, 8, 18, 11, 29).getTime())).toBe(true);
    expect(canCancelLateCheckoutRequest(request, new Date(2026, 8, 18, 11, 30).getTime())).toBe(false);
    expect(canCancelLateCheckoutRequest(request, new Date(2026, 8, 18, 11, 31).getTime())).toBe(false);
  });
  it('shows the dependent-service reason ahead of the cancellation cutoff', async () => {
    const late: SessionServiceRequest = { sessionRequestId: 'late', kind: 'LATE_CHECKOUT', origin: 'SERVICES', title: 'Late check-out', status: 'REQUESTED', createdAtMs: 1, details: { type: 'LATE_CHECKOUT', serviceDate: '2026-09-18', checkoutUntil: '14:00' } };
    const dependent: SessionServiceRequest = { sessionRequestId: 'room', kind: 'ROOM_SERVICE', origin: 'SERVICES', title: 'Room Service', status: 'REQUESTED', createdAtMs: 2, details: { type: 'ROOM_SERVICE', serviceDate: '2026-09-18', deliveryTime: '13:00', items: [] } };
    const ui = await render(<SessionServiceRequestCard nowMs={new Date(2026, 8, 18, 11, 31).getTime()} onRemove={jest.fn()} request={late} requests={[late, dependent]} />);
    expect(ui.getByTestId('remove-session-service-request-cutoff-late')).toHaveTextContent('Este Late check-out no puede cancelarse porque tienes servicios programados después de la hora de salida normal.');
  });
});
