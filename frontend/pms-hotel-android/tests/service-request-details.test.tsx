import { ServiceRequestDisclosureGroup } from '@/modules/service-requests/presentation/ServiceRequestDisclosure';
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

    await fireEvent.press(ui.getByLabelText('Expandir detalles de Room Service'));
    expect(ui.getByText('Completado')).toBeTruthy();
    expect(ui.getByText('Café × 2')).toBeTruthy();
    await fireEvent.press(ui.getByLabelText('Contraer detalles de Room Service'));
    expect(ui.getByTestId('session-service-request-card-done-room-body')).toHaveStyle({height:192});
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

it('restores direct editing in mock service cards and keeps disclosure independent from the action',async()=>{
 const edit=jest.fn();const requests:SessionServiceRequest[]=['HOUSEKEEPING','ROOM_SERVICE','AMENITIES'].map((kind,index)=>({sessionRequestId:`mock-${index}`,kind:kind as SessionServiceRequest['kind'],origin:'SERVICES',status:'REQUESTED',title:kind,summary:'Resumen compacto',createdAtMs:1,details:{type:'HOUSEKEEPING',cleaningType:'FULL_CLEANING',timeSlot:'10:00–11:00',notes:'Información adicional'}}));
 const ui=await render(<ServiceRequestDisclosureGroup>{requests.map(request=><SessionServiceRequestCard key={request.sessionRequestId} nowMs={Date.parse('2030-01-01T00:00:00Z')} request={request} onEdit={edit}/>)}</ServiceRequestDisclosureGroup>);
 for(const [index,request] of requests.entries()){
   await fireEvent.press(ui.getByLabelText(`Expandir detalles de ${request.title}`));expect(edit).toHaveBeenCalledTimes(index);await fireEvent.press(ui.getByLabelText(`Editar ${request.title}`));expect(edit).toHaveBeenLastCalledWith(request);
 }
});

it.each(['HOUSEKEEPING','ROOM_SERVICE','AMENITIES'] as const)('keeps %s counts out of the compact mock summary without losing expanded information',async kind=>{
 const request:SessionServiceRequest={sessionRequestId:'compact',kind,origin:'SERVICES',status:'REQUESTED',title:kind,createdAtMs:1,summary:'2 ene · 10:00 · 3 artículos',
 details:kind==='HOUSEKEEPING'?{type:'HOUSEKEEPING',serviceDate:'2030-01-02',timeSlot:'10:00–11:00',cleaningType:'FULL_CLEANING',notes:'Nota completa'}:kind==='ROOM_SERVICE'?{type:'ROOM_SERVICE',serviceDate:'2030-01-02',deliveryTime:'10:00',items:[{itemFixtureKey:'coffee',quantity:3}],notes:'Nota completa'}:{type:'AMENITIES',serviceDate:'2030-01-02',deliveryTime:'10:00',items:[{itemFixtureKey:'towels',quantity:3}],notes:'Nota completa'}};
 const ui=await render(<SessionServiceRequestCard request={request}/>);expect(ui.queryByText(/3 artículos/)).toBeNull();await fireEvent.press(ui.getByLabelText(`Expandir detalles de ${kind}`));expect(ui.getByText('Notas: Nota completa')).toBeTruthy();expect(ui.getByText('Detalle: 2 ene · 10:00 · 3 artículos')).toBeTruthy();
});

it('does not add a chevron to summary-only mock cards in any of the three services',async()=>{
 const edit=jest.fn();const requests:SessionServiceRequest[]=['HOUSEKEEPING','ROOM_SERVICE','AMENITIES'].map((kind,index)=>({sessionRequestId:`summary-${index}`,kind:kind as SessionServiceRequest['kind'],origin:'SERVICES',status:'REQUESTED',title:kind,summary:'Resumen disponible',createdAtMs:1}));
 const ui=await render(<ServiceRequestDisclosureGroup>{requests.map(request=><SessionServiceRequestCard key={request.sessionRequestId} request={request} onEdit={edit}/>)}</ServiceRequestDisclosureGroup>);
 for(const request of requests){expect(ui.queryByLabelText(`Expandir detalles de ${request.title}`)).toBeNull();await fireEvent.press(ui.getByLabelText(`Editar ${request.title}`));expect(edit).toHaveBeenLastCalledWith(request);}
});
