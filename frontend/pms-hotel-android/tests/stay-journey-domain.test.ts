import {ticketLine,ticketMoney} from '@/modules/checkout/domain/journeyTicket';
import {mapJourneyDocument,mapJourneyState,mapJourneySummary,mapSimulatedReceipt} from '@/modules/checkout/data/mappers/mapStayJourney';
import {journeyContext as c,journeyProperty,journeyState,journeySummary,journeyDocument,journeyReceipt} from '@/test/stayJourneyFixture';
import {luhn,validateSyntheticPayment} from '@/modules/checkout/domain/syntheticPayment';
import {journeyInvoice} from '@/modules/checkout/domain/journeyInvoice';
import {buildInvoicePdfHtml} from '@/modules/checkout/domain/buildInvoicePdfHtml';
const valid={number:'4242 4242 4242 4242',expiry:'12/35',cvv:'123',holder:'Titular QA',amount:'30.00'};
it('maps persisted scope and exact version without allowing foreign properties or fictional payments',()=>{
 expect(mapJourneyState(journeyState(),c).stay.updatedAt).toBe('2030-01-02T14:00:00.123456Z');expect(mapJourneySummary(journeySummary(),c,journeyProperty)).toEqual(journeySummary());
 expect(()=>mapJourneyState({...journeyState(),stay:{...journeyState().stay,stayId:journeyProperty}},c)).toThrow();
 expect(()=>mapJourneySummary(journeySummary(),c,c.reservationId)).toThrow();expect(()=>mapJourneySummary({...journeySummary(),balance:100},c,journeyProperty)).toThrow();
 expect(()=>mapSimulatedReceipt({...journeyReceipt(),result:'DECLINED'})).toThrow();expect(()=>mapJourneyDocument({...journeyDocument(),snapshot:journeySummary()},c,journeyProperty)).toThrow();
});
it('accepts only validated allowed synthetic cards and emits only the approved Visa token',()=>{
 expect(luhn('4242424242424242')).toBe(true);expect(luhn('4242424242424241')).toBe(false);
 expect(validateSyntheticPayment(valid,'100.00','2030-01-02')).toEqual({token:'demo_visa_approved'});
 expect(validateSyntheticPayment({...valid,number:'378282246310005',cvv:'1234'},'100.00','2030-01-02').error).toBeTruthy();
 for(const input of [{...valid,number:'4000000000000002'},{...valid,number:'4242'},{...valid,number:'4242424242424241'},{...valid,expiry:'13/99'},{...valid,expiry:'01/29'},{...valid,cvv:'999'},{...valid,holder:''},{...valid,amount:'0'},{...valid,amount:'101.00'},{...valid,amount:'1.001'}])expect(validateSyntheticPayment(input,'100.00','2030-01-02').error).toBeTruthy();
 expect(validateSyntheticPayment({...valid,expiry:'01/30'},'100.00','2030-01-31').token).toBeTruthy();expect(validateSyntheticPayment({...valid,expiry:'01/30'},'100.00','2030-02-01').error).toBeTruthy();
});
it('renders identical financial snapshot after reload and escapes HTML without local recalculation',()=>{
 const dto=journeyDocument(),document=mapJourneyDocument(dto,c,journeyProperty);const payload=journeyInvoice(document),html=buildInvoicePdfHtml(payload);
 expect(payload.referenceText).toBe(dto.id);expect(payload.generatedAt.toISOString()).toBe(new Date(dto.issuedAt).toISOString());expect(payload.folio.totalText).toBe('Q100.00');
 for(const text of ['Documento informativo — sin validez fiscal','Pagos: Q100.00','Saldo: Q0.00','Alojamiento','Pago simulado',dto.id])expect(html).toContain(text);
 expect(buildInvoicePdfHtml(journeyInvoice(mapJourneyDocument(JSON.parse(JSON.stringify(dto)),c,journeyProperty)))).toBe(html);
 expect(buildInvoicePdfHtml(journeyInvoice({...document,snapshot:{...document.snapshot,movements:[{...document.snapshot.movements[0],description:'<script>unsafe</script>'}]}}))).not.toContain('<script>unsafe');
});
it('renders a ticket with readable persisted service slot and no guessed dates or UUID descriptions',()=>{
 const line=journeySummary().movements[0];expect(ticketLine({...line,description:'Room Service · 29/10 · 14:35'})).toEqual({type:'Servicio',label:'Room Service · 29/10 · 14:35',price:'Q. 100.00'});
 expect(ticketLine({...line,description:`Room Service · ${c.reservationId}`})).toMatchObject({type:'Servicio',label:'Room Service'});expect(ticketLine(line)).toMatchObject({type:'Alojamiento',label:'Habitación'});expect(ticketLine({...line,kind:'PAYMENT',description:'Pago SIM-'+c.reservationId,amount:'-30.00'})).toEqual({type:'Pago',label:'Abono',price:'−Q. 30.00'});expect(ticketMoney('650.00')).toBe('Q. 650.00');
});
