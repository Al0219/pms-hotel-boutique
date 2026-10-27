import {render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it,vi} from 'vitest';
import {OperationalRequestTable} from './operational-request-table';
import {initialRequestFilters,presentOperationalRequests,type OperationalRequestRow,type RequestState} from './operational-request-table.presentation';
interface Row extends OperationalRequestRow {time:string;item:string;}
const row=(id:string,status:RequestState,date:string,time:string):Row=>({id,status,serviceDate:date,time,reference:`RES-${id}`,roomLabel:id==='cancel'?null:'204',notes:id==='late'?'Sin azúcar':'Entregar en puerta',item:'Kit dental'});
const rows=[row('late','OPEN','2030-01-03','09:00'),row('progress','IN_PROGRESS','2030-01-01','08:00'),row('done','DONE','2030-01-01','10:00'),row('early','OPEN','2030-01-02','09:00'),row('cancel','CANCELLED','2030-01-01','11:00'),row('earliest','OPEN','2030-01-02','08:00')];
const time=(r:Row)=>r.time;
it('defaults to pending, sorts by state then nearest date/time and never mutates query data',()=>{
 const original=rows.map(row=>row.id);expect(presentOperationalRequests(rows,initialRequestFilters,time).map(row=>row.id)).toEqual(['earliest','early','late','progress']);expect(rows.map(row=>row.id)).toEqual(original);
});
it('filters all statuses, dates, reservation, room, accented notes and module detail search text',()=>{
 expect(presentOperationalRequests(rows,{...initialRequestFilters,status:'DONE'},time).map(r=>r.id)).toEqual(['done']);expect(presentOperationalRequests(rows,{...initialRequestFilters,status:'CANCELLED'},time).map(r=>r.id)).toEqual(['cancel']);
 expect(presentOperationalRequests(rows,{...initialRequestFilters,status:'ALL'},time)).toHaveLength(6);
 expect(presentOperationalRequests(rows,{...initialRequestFilters,date:'2030-01-02'},time).map(r=>r.id)).toEqual(['earliest','early']);
 expect(presentOperationalRequests(rows,{...initialRequestFilters,search:'AZUCAR'},time).map(r=>r.id)).toEqual(['late']);
 expect(presentOperationalRequests(rows,{...initialRequestFilters,search:'RES-progress'},time).map(r=>r.id)).toEqual(['progress']);
 expect(presentOperationalRequests(rows,{...initialRequestFilters,search:'204'},time)).toHaveLength(4);
 expect(presentOperationalRequests(rows,{...initialRequestFilters,search:'dental'},time,r=>r.item)).toHaveLength(4);
 expect(presentOperationalRequests(rows,{...initialRequestFilters,search:'azucar',date:'2030-01-02'},time)).toEqual([]);
});
function setup(){const action=vi.fn();const ui=render(<OperationalRequestTable rows={rows} label="Solicitudes" time={time}
 columns={[{key:'reference',header:'Reserva / Habitación',render:row=><span>{row.reference} · {row.roomLabel??'Por asignar'}</span>},{key:'date',header:'Fecha / Entrega',render:row=>`${row.serviceDate} · ${row.time}`},{key:'notes',header:'Notas',render:row=>row.notes},{key:'actions',header:'Acciones',render:row=><button onClick={()=>action(row.id)}>Gestionar {row.id}</button>}]}
 renderDetails={row=><ul><li>{row.item} × 2 · {row.reference}</li></ul>}/>);return {...ui,action};}
it('renders pending and accessible labels by default; state/date/search controls and clear work together',async()=>{
 setup();expect(screen.getByLabelText('Estado')).toHaveValue('PENDING');expect(screen.queryByText('RES-done · 204')).not.toBeInTheDocument();expect(screen.getAllByLabelText('Estado: Solicitado')).toHaveLength(3);
 await userEvent.selectOptions(screen.getByLabelText('Estado'),'ALL');expect(screen.getByLabelText('Estado: Cancelado')).toBeInTheDocument();
 await userEvent.type(screen.getByLabelText('Buscar'),'azucar');expect(screen.getByText('RES-late · 204')).toBeInTheDocument();expect(screen.queryByText('RES-earliest · 204')).not.toBeInTheDocument();
 await userEvent.clear(screen.getByLabelText('Buscar'));await userEvent.type(screen.getByLabelText('Fecha del servicio'),'2030-01-02');expect(screen.getByText('RES-earliest · 204')).toBeInTheDocument();expect(screen.queryByText('RES-late · 204')).not.toBeInTheDocument();
 await userEvent.click(screen.getByRole('button',{name:'Limpiar filtros'}));expect(screen.getByLabelText('Estado')).toHaveValue('PENDING');expect(screen.getByLabelText('Fecha del servicio')).toHaveValue('');
});
it('expands one read-only detail row at a time by pointer or keyboard and excludes action buttons',async()=>{
 const {action}=setup();expect(screen.queryByRole('region',{name:'Artículos de RES-earliest'})).not.toBeInTheDocument();
 await userEvent.click(screen.getByRole('button',{name:'Ver artículos de RES-earliest'}));expect(screen.getByRole('region',{name:'Artículos de RES-earliest'})).toHaveTextContent('Kit dental × 2');
 await userEvent.click(screen.getByRole('button',{name:'Gestionar earliest'}));expect(action).toHaveBeenCalledWith('earliest');expect(screen.getByRole('button',{name:'Ocultar artículos de RES-earliest'})).toHaveAttribute('aria-expanded','true');
 await userEvent.click(screen.getByText('RES-early · 204'));expect(screen.queryByRole('region',{name:'Artículos de RES-earliest'})).not.toBeInTheDocument();expect(screen.getByRole('region',{name:'Artículos de RES-early'})).toBeInTheDocument();
 const tableRow=screen.getByText('RES-early · 204').closest('tr')!;tableRow.focus();await userEvent.keyboard('{Enter}');expect(screen.queryByRole('region',{name:'Artículos de RES-early'})).not.toBeInTheDocument();
 expect(within(screen.getByRole('table')).getAllByRole('columnheader').map(el=>el.textContent)).toEqual(['Reserva / Habitación','Fecha / Entrega','Notas','Acciones']);
});
it('keeps a textual state label and state attribute for every soft color',async()=>{
 setup();await userEvent.selectOptions(screen.getByLabelText('Estado'),'ALL');for(const label of ['Solicitado','En proceso','Completado','Cancelado'])expect(screen.getAllByLabelText(`Estado: ${label}`).length).toBeGreaterThan(0);
 expect(screen.getByText('RES-done · 204').closest('tr')).toHaveAttribute('data-request-state','DONE');
});
