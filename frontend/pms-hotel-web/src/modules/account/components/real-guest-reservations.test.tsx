import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { GuestReservationsPage } from './guest-reservations-page';
import { HistoryPage } from './history-page';
import { refreshGuestSession } from '@/modules/auth';
import { HttpStatusError } from '@/lib/http/errors';
import { getStayHistory } from '../service/account.service';
const r='11111111-1111-4111-8111-111111111111',s='22222222-2222-4222-8222-222222222222';
const row={reservationId:r,stayId:s,confirmationCode:'REAL-CONFIRMED',propertyName:'Hotel PostgreSQL',reservationStatus:'CONFIRMED',arrival:'2036-01-01',departure:'2036-01-03',roomCode:null,status:'RESERVED'};
const retrySession = vi.hoisted(() => vi.fn());
vi.mock('@/modules/auth',()=>({useGuestSession:()=>({account:{id:'real-account'},status:'signed-in',retrySession}),GuestAccountGate:({children}:{children:React.ReactNode})=>children,refreshGuestSession:vi.fn(async()=>undefined)}));
vi.mock('next/navigation',()=>({useRouter:()=>({replace:vi.fn()})}));
let client:QueryClient;
beforeEach(()=>{vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API','false');client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});});
afterEach(()=>{cleanup();client.clear();vi.unstubAllEnvs();vi.clearAllMocks();focusManager.setFocused(undefined);});
function mount(history=false){return render(<QueryClientProvider client={client}>{history?<HistoryPage/>:<GuestReservationsPage/>}</QueryClientProvider>);}
function handlers(rows=[row]) {
 mockServer.use(http.post('*/api/auth/guest/account/reservations/reconcile',()=>new HttpResponse(null,{status:204})),
 http.get('*/api/auth/guest/account/reservations',()=>HttpResponse.json(rows)),
 http.get(`*/api/auth/guest/account/reservations/${r}/stays/${s}`,()=>HttpResponse.json({id:s,reservationId:r,roomType:{id:'type',name:'Tipo real persistido'},room:null,arrival:row.arrival,departure:row.departure,status:'RESERVED'})));
}
it.each([false,true])('lists the real reservation without provisional history (legacy history route=%s)',async history=>{
 handlers();mount(history);expect(await screen.findByRole('link',{name:'REAL-CONFIRMED'})).toBeInTheDocument();
 expect(screen.getByText('Hotel PostgreSQL')).toBeInTheDocument();expect(screen.getByText('Confirmada')).toBeInTheDocument();
 expect(screen.queryByText(/Responsable:|Política:|Ocupantes|HB-2026/)).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Ver estancia 1'}));expect(await screen.findByRole('heading',{name:'Tipo real persistido'})).toBeInTheDocument();
});
it('groups multiple stays of one reservation without duplicate reservations',async()=>{
 handlers([row,{...row,stayId:'33333333-3333-4333-8333-333333333333'}]);mount();
 await screen.findByText('Hotel PostgreSQL');expect(screen.getAllByRole('link',{name:'REAL-CONFIRMED'})).toHaveLength(1);expect(screen.getAllByRole('button',{name:/Ver estancia/})).toHaveLength(2);
});
it('recovers and refetches newly linked reservations when returning focus',async()=>{
 let visible=false, reconciles=0;
 mockServer.use(http.post('*/api/auth/guest/account/reservations/reconcile',()=>{reconciles++;return new HttpResponse(null,{status:204});}),http.get('*/api/auth/guest/account/reservations',()=>HttpResponse.json(visible?[row]:[])));
 mount();await screen.findByText('Aún no hay reservas vinculadas a esta cuenta.');visible=true;focusManager.setFocused(false);focusManager.setFocused(true);
 await screen.findByRole('link',{name:'REAL-CONFIRMED'});expect(reconciles).toBe(2);
});
it('fails visibly when reconciliation fails and never falls back to history',async()=>{
 const lists=vi.fn();mockServer.use(http.post('*/api/auth/guest/account/reservations/reconcile',()=>new HttpResponse(null,{status:503})),http.get('*/api/auth/guest/account/reservations',()=>{lists();return HttpResponse.json([]);}));
 mount();expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos consultar');expect(lists).not.toHaveBeenCalled();expect(screen.queryByText('Aún no hay reservas vinculadas a esta cuenta.')).not.toBeInTheDocument();
});
it('uses a single Guest refresh on expired session and then retries own reads',async()=>{
 let attempts=0;mockServer.use(http.post('*/api/auth/guest/account/reservations/reconcile',()=>new HttpResponse(null,{status:++attempts===1?401:204})),http.get('*/api/auth/guest/account/reservations',()=>HttpResponse.json([row])));
 mount();await screen.findByRole('link',{name:'REAL-CONFIRMED'});expect(refreshGuestSession).toHaveBeenCalledTimes(1);expect(attempts).toBe(2);
});
it('rejects the provisional history service in real mode before any request',()=>{
 expect(()=>getStayHistory('arbitrary-account')).toThrow('MOCK_STAY_HISTORY_DISABLED');
});
it('maps inconsistent or duplicate stay data to a visible error',async()=>{
 handlers([row,row]);mount();await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('No pudimos consultar'));
});

it('delegates an expired Guest refresh to the canonical session controller', async()=>{
 mockServer.use(http.post('*/api/auth/guest/account/reservations/reconcile',()=>new HttpResponse(null,{status:401})));
 vi.mocked(refreshGuestSession).mockRejectedValueOnce(new HttpStatusError(401,'Expired'));
 mount();await screen.findByRole('alert');expect(retrySession).toHaveBeenCalledTimes(1);
});

it('never renders a cached provisional reservation while real mode is loading', async()=>{
 client.setQueryData(['guest','reservations','real-account'],[{id:'MOCK-CACHED',propertyName:'Fixture hotel',stays:[]}]);
 handlers();mount();expect(screen.queryByText('MOCK-CACHED')).not.toBeInTheDocument();
 await screen.findByRole('link',{name:'REAL-CONFIRMED'});expect(screen.queryByText('Fixture hotel')).not.toBeInTheDocument();
});

it('keeps loading separate from an empty history and retries a failed real read', async()=>{
 let release!:()=>void; const pending=new Promise<void>(resolve=>{release=resolve;}); let failed=true;
 mockServer.use(http.post('*/api/auth/guest/account/reservations/reconcile',()=>new HttpResponse(null,{status:204})),
 http.get('*/api/auth/guest/account/reservations',async()=>{await pending;return failed?new HttpResponse(null,{status:503}):HttpResponse.json([row]);}));
 mount();await screen.findByText('Consultando tus reservas…');expect(screen.queryByText('Aún no hay reservas vinculadas a esta cuenta.')).not.toBeInTheDocument();
 release();expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos consultar');
 failed=false;fireEvent.click(screen.getByRole('button',{name:'Reintentar consulta'}));await screen.findByRole('link',{name:row.confirmationCode});
});

it('keeps an unavailable stay private without discarding the linked reservation',async()=>{
 handlers();mockServer.use(http.get(`*/api/auth/guest/account/reservations/${r}/stays/${s}`,()=>new HttpResponse(null,{status:404})));
 mount();fireEvent.click(await screen.findByRole('button',{name:'Ver estancia 1'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Esta estancia no está disponible en tu cuenta.');
 expect(screen.getByRole('link',{name:row.confirmationCode})).toBeInTheDocument();expect(screen.queryByText('Tipo real persistido')).not.toBeInTheDocument();
});

it('offers verification for an honest empty history without fabricating a reservation',async()=>{
 handlers([]);mount();await screen.findByText('Aún no hay reservas vinculadas a esta cuenta.');
 expect(screen.getByRole('link',{name:'Vincular mi reserva'})).toHaveAttribute('href','/cuenta/reservas/vincular');
 expect(screen.getByText(/Si acabas de reservar como invitado/)).toBeInTheDocument();
 expect(screen.queryByRole('link',{name:row.confirmationCode})).not.toBeInTheDocument();
});

it('filters real history immediately by reference, hotel and persisted state and resets without losing rows',async()=>{
 handlers([row,{...row,reservationId:'44444444-4444-4444-8444-444444444444',stayId:'55555555-5555-4555-8555-555555555555',confirmationCode:'OTHER-BOOKING',reservationStatus:'CANCELLED',propertyName:'Hotel Segundo'}]);mount();
 await screen.findByRole('link',{name:row.confirmationCode});fireEvent.change(screen.getByLabelText('Buscar reserva u hotel'),{target:{value:'Hotel Segundo'}});expect(screen.queryByRole('link',{name:row.confirmationCode})).not.toBeInTheDocument();expect(screen.getByRole('link',{name:'OTHER-BOOKING'})).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Estado'),{target:{value:'CONFIRMED'}});expect(screen.getByRole('heading',{name:'No encontramos reservas con estos filtros'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Restablecer filtros'}));expect(screen.getByRole('link',{name:row.confirmationCode})).toBeInTheDocument();
});
