import {render,screen,within,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {beforeEach,expect,it,vi} from 'vitest';
import {TransfersWorkspace} from './transfers-workspace';
const services=vi.hoisted(()=>({read:vi.fn(),transition:vi.fn()}));
vi.mock('../service/transfers.service',()=>({readTransfers:services.read,transitionTransfer:services.transition}));
const place=(type:'HOTEL'|'PLACE',name:string)=>({key:name,displayText:name,type,latitude:14,longitude:-90});
const row={id:'transfer',propertyId:'property',reference:'TRANSFERQA',roomLabel:'203',notes:null,serviceDate:'2030-01-02',deliveryTime:'09:00',status:'OPEN',updatedAt:'2030-01-01T12:00:00Z',items:[{origin:place('HOTEL','Hotel'),destination:place('PLACE','Aeropuerto'),passengers:2}]};
function mount(manage=true){const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{gcTime:0}}});return render(<QueryClientProvider client={client}><TransfersWorkspace propertyId="property" sessionId="session" canManage={manage}/></QueryClientProvider>);}
beforeEach(()=>{services.read.mockReset().mockResolvedValue([row]);services.transition.mockReset().mockResolvedValue({});});
it('uses shared searchable/filtered table and confirms Staff transitions',async()=>{mount();await screen.findByText('Hotel → Aeropuerto');expect(screen.getByRole('table',{name:'Traslados'})).toBeVisible();await userEvent.click(screen.getByRole('button',{name:'Iniciar'}));await userEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Confirmar'}));await waitFor(()=>expect(services.transition).toHaveBeenCalledTimes(1));expect(services.transition).toHaveBeenCalledWith('property',row);});
it('retains intake reads without manage actions',async()=>{mount(false);await screen.findByText('Hotel → Aeropuerto');expect(screen.queryByRole('button',{name:'Iniciar'})).not.toBeInTheDocument();});
it('searches route and retains existing reservation filters',async()=>{mount();await screen.findByText('Hotel → Aeropuerto');await userEvent.type(screen.getByLabelText('Buscar'),'no match');expect(screen.queryByText('Hotel → Aeropuerto')).not.toBeInTheDocument();await userEvent.click(screen.getByRole('button',{name:'Limpiar filtros'}));expect(screen.getByText('Hotel → Aeropuerto')).toBeVisible();});
