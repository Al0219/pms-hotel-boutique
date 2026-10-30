import type {JourneySummary} from './StayJourney';
export function ticketLine(line:JourneySummary['movements'][number]){
 const uuid=/[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}/gi;
 if(line.kind==='PAYMENT')return{type:'Pago',label:'Abono',price:ticketMoney(line.amount)};
 if(/room service/i.test(line.description))return{type:'Servicio',label:uuid.test(line.description)?'Room Service':line.description,price:ticketMoney(line.amount)};
 if(line.kind==='CHARGE'&&/alojamiento|habitación|habitacion/i.test(line.description))return{type:'Alojamiento',label:'Habitación',price:ticketMoney(line.amount)};
 return{type:line.kind==='ADJUSTMENT'?'Ajuste':'Cargo',label:line.description.replace(uuid,'').trim()||'Movimiento del folio',price:ticketMoney(line.amount)};
}
export function ticketMoney(amount:string){return amount.startsWith('-')?'−Q. '+amount.slice(1):'Q. '+amount;}
