import type {JourneyDocument} from './StayJourney';
import type {InvoiceRenderData} from './InvoiceRenderData';
export function journeyInvoice(document:JourneyDocument):InvoiceRenderData{
 const s=document.snapshot;
 return{documentKind:'PERSISTED',disclaimer:s.disclaimer,referenceText:document.id,generatedAt:new Date(document.issuedAt),generatedAtText:new Date(document.issuedAt).toLocaleString('es-GT',{timeZone:s.stay.timezone})+` · ${s.stay.timezone}`,
  content:{roomDisplayText:`Reserva ${s.stay.confirmationCode}`,stayDatesText:`${s.stay.arrival}–${s.stay.departure}`,expectedDepartureText:`Salida confirmada · ${s.stay.status}`,checks:[],departureNoteText:''},
  folio:{items:s.movements.map(m=>({key:m.id,label:`${m.kind==='PAYMENT'?'Pago':m.kind==='CHARGE'?'Cargo':'Ajuste'} · ${m.description}`,priceText:`Q${m.amount}`})),totalStayText:`Cargos: Q${s.charges} · Ajustes: Q${s.adjustments}`,paidGuaranteeText:`Pagos: Q${s.payments}`,pendingBalanceText:`Saldo: Q${s.balance}`,totalText:`Q${s.charges}`}};
}
