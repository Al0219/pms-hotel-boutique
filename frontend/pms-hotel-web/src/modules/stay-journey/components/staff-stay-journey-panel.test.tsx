import {HttpStatusError} from '@/lib/http';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffStayJourneyPanel } from './staff-stay-journey-panel';
import { context, document, receipt, summary, documentFileFixture } from '@/test/stay-journey-fixture';
const mocks = vi.hoisted(() => ({ read: vi.fn(), pay: vi.fn(), reconcile: vi.fn(),file:vi.fn() }));
vi.mock('../service/stay-journey.service', () => ({ readJourney: mocks.read, simulateJourneyPayment: mocks.pay, reconcileJourney: mocks.reconcile,documentFile:mocks.file }));
const clients: QueryClient[] = [];
function mount(paymentOpen=false) { const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } }); clients.push(client); return render(<QueryClientProvider client={client}><StaffStayJourneyPanel {...context} actorId="actor" sessionId="session" financial paymentOpen={paymentOpen} onOpenChange={vi.fn()} /></QueryClientProvider>); }
beforeEach(() => { sessionStorage.clear();mocks.file.mockReset().mockResolvedValue(documentFileFixture()); mocks.read.mockImplementation((_c, action) => Promise.resolve(action === 'requests' ? [] : action === 'document' ? document() : summary())); mocks.pay.mockReset().mockResolvedValue(receipt()); mocks.reconcile.mockReset().mockResolvedValue(summary()); });
afterEach(() => { cleanup(); clients.splice(0).forEach(c => c.clear()); sessionStorage.clear(); });
describe('Staff finance tools within Folio', () => {
 it('has no independent request panel and submits only an approved token after validation',async()=>{
  mount(true);const button=await screen.findByRole('button',{name:'Confirmar'});await waitFor(()=>expect(button).toBeEnabled());expect(screen.queryByText('Entrada y salida del huésped')).not.toBeInTheDocument();expect(screen.queryByText('Saldo contable:')).not.toBeInTheDocument();expect(mocks.pay).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Confirmar'}));expect(mocks.pay).not.toHaveBeenCalled();
  for(const [label,value] of [['Número de tarjeta ficticia','4242424242424242'],['Vencimiento MM/AA','12/30'],['CVV ficticio','123'],['Titular de prueba','María López'],['Importe GTQ','30.00']])fireEvent.change(screen.getByLabelText(label),{target:{value}});
  expect(screen.queryByText('Resultado de simulación')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Confirmar'}));await screen.findByText(/aprobado y registrado/);expect(mocks.pay.mock.calls[0][1]).toEqual({amount:'30.00',currency:'GTQ',instrumentToken:'demo_visa_approved'});
 });
 it('offers the stored PDF for viewing and downloading without a second generation',async()=>{
  mocks.read.mockImplementation((_c,action)=>Promise.resolve(action==='requests'?[]:action==='document'?document():{...summary(),documentId:context.reservationId}));mount();expect(await screen.findByRole('button',{name:'Visualizar documento'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'Descargar'})).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Generar documento'})).not.toBeInTheDocument();
 });
 it('views and downloads a PDF Blob using the original file identity',async()=>{
  mocks.read.mockImplementation((_c,action)=>Promise.resolve(action==='requests'?[]:action==='document'?document():{...summary(),documentId:context.reservationId}));mount();await screen.findByRole('button',{name:'Visualizar documento'});
  const createDescriptor=Object.getOwnPropertyDescriptor(URL,'createObjectURL'),revokeDescriptor=Object.getOwnPropertyDescriptor(URL,'revokeObjectURL');const create=vi.fn(()=> 'blob:original-pdf');Object.defineProperty(URL,'createObjectURL',{configurable:true,value:create});Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:vi.fn()});const open=vi.spyOn(window,'open').mockReturnValue(null),click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
  vi.useFakeTimers();try{fireEvent.click(screen.getByRole('button',{name:'Visualizar documento'}));expect(open).toHaveBeenCalledWith('blob:original-pdf','_blank','noopener,noreferrer');fireEvent.click(screen.getByRole('button',{name:'Descargar'}));expect(click).toHaveBeenCalledTimes(1);expect(create).toHaveBeenCalledTimes(2);expect((create.mock.calls as unknown as [Blob][])[0][0].type).toBe('application/pdf');expect(mocks.pay).not.toHaveBeenCalled();vi.runOnlyPendingTimers();}finally{vi.useRealTimers();open.mockRestore();click.mockRestore();if(createDescriptor)Object.defineProperty(URL,'createObjectURL',createDescriptor);else Reflect.deleteProperty(URL,'createObjectURL');if(revokeDescriptor)Object.defineProperty(URL,'revokeObjectURL',revokeDescriptor);else Reflect.deleteProperty(URL,'revokeObjectURL');}
 });
 it('issues an eligible historical snapshot once and then exposes only the stored PDF',async()=>{
  let issued=false;mocks.file.mockImplementation(async(_c,issue)=>{if(issue)issued=true;if(!issued)throw new HttpStatusError(404,'Not issued');return documentFileFixture();});mocks.read.mockImplementation((_c,action)=>Promise.resolve(action==='requests'?[]:action==='document'?document():{...document().snapshot,stay:{...document().snapshot.stay,status:'CHECKED_OUT'},documentId:document().id}));mount();const button=await screen.findByRole('button',{name:'Generar documento'});fireEvent.click(button);fireEvent.click(button);expect(await screen.findByRole('button',{name:'Visualizar documento'})).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Generar documento'})).not.toBeInTheDocument();expect(mocks.file.mock.calls.filter(c=>c[1]===true)).toHaveLength(1);
 });
 it('does not pay unposted orders and reconciles only on explicit action',async()=>{
  mocks.read.mockImplementation((_c,action)=>Promise.resolve(action==='requests'?[]:{...summary(),unpostedOrders:1}));mount();const button=await screen.findByRole('button',{name:'Contabilizar pedidos entregados'});expect(mocks.reconcile).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:'Tarjeta de prueba'})).not.toBeInTheDocument();fireEvent.click(button);await waitFor(()=>expect(mocks.reconcile).toHaveBeenCalledTimes(1));
 });
});
