export const syntheticCards=[{number:'4242424242424242',token:'demo_visa_approved',cvv:'123'}] as const;
export const simulationTokens=['demo_visa_approved','demo_mastercard_approved','demo_amex_approved','demo_card_declined','demo_gateway_error'] as const;
export function minor(value:string):bigint|null{if(!/^\d{1,15}(\.\d{1,2})?$/.test(value))return null;const [whole,fraction='']=value.split('.');return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));}
export function luhn(value:string):boolean{if(!/^\d+$/.test(value))return false;let sum=0,twice=false;for(let i=value.length-1;i>=0;i--){let n=Number(value[i]);if(twice){n*=2;if(n>9)n-=9;}sum+=n;twice=!twice;}return sum%10===0;}
export type VisaFields={number:string;expiry:string;cvv:string;holder:string;amount:string};
export type VisaErrors=Partial<Record<keyof VisaFields,string>>;
export function normaliseHolder(value:string){return value.normalize('NFC').trim().replace(/\s+/gu,' ');}
export function maskVisa(value:string){return value.replace(/\D/g,'').slice(0,16).replace(/(.{4})(?=.)/g,'$1 ');}
/** Keep an explicit separator stable during editing; infer a month only from a digit stream. */
export function maskExpiry(value:string,previous='',deleting=value.length<previous.length){
 const clean=value.replace(/[^\d/]/g,'');
 if(!clean)return '';
 if(deleting&&previous.endsWith('/')&&clean===previous.slice(0,-1))return clean.slice(0,-1);
 if(clean.includes('/')){
  const [month,...rest]=clean.split('/'),year=rest.join('').slice(0,2);
  if(month.length<2){
   if(deleting||month==='0'||month==='')return month+'/'+year;
   return '0'+month+'/'+year;
  }
  if(month.length===2&&Number(month)>=1&&Number(month)<=12)return month+'/'+year;
  return previous;
 }
 const digits=clean.replace(/\D/g,'');
 if(digits[0]>='2')return '0'+digits[0]+'/'+digits.slice(1,3);
 if(digits.length===1)return digits;
 if(digits[0]==='0')return digits[1]==='0'?'0':digits.slice(0,2)+'/'+digits.slice(2,4);
 return digits[1]<='2'?digits.slice(0,2)+'/'+digits.slice(2,4):'01/'+digits.slice(1,3);
}
export function maskHolder(value:string){return [...value.normalize('NFC').replace(/[^\p{L}\p{M} .]/gu,'')].slice(0,40).join('');}
export function paymentAmountError(balance:string){const [whole,fraction='']=balance.split('.');return `Debe ingresar un importe entre Q. 0.00 y Q. ${whole}.${fraction.padEnd(2,'0').slice(0,2)}.`;}
export function maskAmount(value:string,previous=''){const clean=value.replace(/[^\d.,]/g,'').replace(',','.');return /^\d{0,15}(\.\d{0,2})?$/.test(clean)?clean:previous;}
export function visaPaymentErrors(input:VisaFields,balance:string,today:string):VisaErrors{
 const errors:VisaErrors={},number=input.number.replace(/ /g,'');
 if(!/^4\d{15}$/.test(number)||!luhn(number)||number!=='4242424242424242')errors.number='Usa la Visa de demostración 4242 4242 4242 4242.';
 const expiry=/^(0[1-9]|1[0-2])\/(\d{2})$/.exec(input.expiry),year=expiry?2000+Number(expiry[2]):0,month=expiry?Number(expiry[1]):0,currentYear=Number(today.slice(0,4)),currentMonth=Number(today.slice(5,7));
 if(!expiry||year<currentYear||year>currentYear+10||year===currentYear&&month<currentMonth)errors.expiry='Ingresa MM/AA vigente, hasta 10 años desde hoy.';
 if(!/^\d{3}$/.test(input.cvv)||input.cvv!=='123')errors.cvv='Usa el CVV ficticio 123.';
 const holder=normaliseHolder(input.holder);
 if([...holder].length<3||[...holder].length>40||(!/^[\p{L}\p{M} .]+$/u.test(holder)||!/\p{L}/u.test(holder)))errors.holder='Ingresa 3–40 caracteres: letras, espacios y puntos.';
 const amount=minor(input.amount),due=minor(balance);if(amount===null||due===null||amount<=0n||amount>due)errors.amount=paymentAmountError(balance);
 return errors;
}
/** Ephemeral validation: only an authorized Visa token can leave the form. */
export function validateSyntheticPayment(input:VisaFields,balance:string,today:string):{token?:string;error?:string}{const errors=visaPaymentErrors(input,balance,today);return Object.keys(errors).length?{error:Object.values(errors)[0]}:{token:'demo_visa_approved'};}
