import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {ReservationDetail} from './reservation-detail';
import {mapStaffReservationDetail} from '../mappers/staff-reservation.mapper';
import {staffReservationFixture} from '../staff-reservation.fixture';
const mocks=vi.hoisted(()=>({read:vi.fn()}));
vi.mock('../hooks/use-reservation-detail',()=>({useReservationDetail:()=>mocks.read()}));
vi.mock('./stay-lifecycle-actions',()=>({StayLifecycleActions:()=> <div><span>Entrada solicitada por el huésped</span><button>Registrar entrada</button></div>}));
vi.mock('@/modules/folio',()=>({StaffReservationFolioPanel:()=> <section><h2>Folio y pagos</h2></section>}));
// A redundant journey panel would remain visible and fail the layout assertion.
vi.mock('@/modules/stay-journey',()=>({StaffStayJourneyPanel:()=> <section><h2>Entrada y salida del huésped</h2></section>}));
afterEach(cleanup);
it('places Guest actions in stay details with exactly one finance panel and no separate journey panel',()=>{
 const dto=staffReservationFixture(),detail=mapStaffReservationDetail(dto);mocks.read.mockReturnValue({data:detail,isLoading:false,error:null,refetch:vi.fn()});render(<ReservationDetail propertyId={dto.propertyId} endpoint="/api/staff/reservations" reservationId={dto.reservationId} sessionId="session" canManage folioAccess={{actorId:'actor',sessionId:'session'}}/>);
 expect(screen.getAllByRole('heading',{name:'Folio y pagos'})).toHaveLength(1);expect(screen.queryByText('Entrada y salida del huésped')).not.toBeInTheDocument();expect(screen.queryByText('No hay solicitudes pendientes.')).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Pago simulado'})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Registrar entrada'})).toBeInTheDocument();expect(screen.getByText('Entrada solicitada por el huésped')).toBeInTheDocument();
});
