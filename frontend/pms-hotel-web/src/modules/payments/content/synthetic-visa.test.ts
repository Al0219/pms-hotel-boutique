import {it,expect} from 'vitest';
import {visaPaymentErrors,normaliseHolder,maskVisa,maskExpiry,maskAmount,maskHolder,paymentAmountError} from './synthetic-visa';
const valid={number:'4242 4242 4242 4242',expiry:'12/35',cvv:'123',holder:'  María   Muñoz  ',amount:'30.00'};
it('validates normalized Unicode names and masks editable Visa, month and amount fields',()=>{
 expect(normaliseHolder(valid.holder)).toBe('María Muñoz');expect(visaPaymentErrors(valid,'100.00','2030-01-02')).toEqual({});
 expect(maskVisa('4242x42424242424299')).toBe('4242 4242 4242 4242');expect(maskExpiry('1226')).toBe('12/26');expect(maskExpiry('12/','12/2')).toBe('12/');expect(maskExpiry('13','1')).toBe('01/3');expect(maskExpiry('00','0')).toBe('0');expect(maskExpiry('','12')).toBe('');expect(maskAmount('30,50')).toBe('30.50');expect(maskAmount('30.501','30.50')).toBe('30.50');expect(maskAmount('3.0.1','3.0')).toBe('3.0');
});
it.each([
 ['number','5555555555554444'],['number','378282246310005'],['number','4000000000000002'],['number','4242424242424241'],['number','424242424242424'],
 ['expiry','13/35'],['expiry','00/35'],['expiry','12/29'],['expiry','12/41'],['expiry','1/35'],
 ['cvv','12'],['cvv','1234'],['cvv','999'],['cvv','1a3'],
 ['holder','Ab'],['holder','Juan2'],['holder','Juan@'],['holder','A'.repeat(41)],
 ['amount','0'],['amount','-1'],['amount','100.01'],['amount','30.001'],['amount','1.2.3']
])('rejects %s=%s next to the correct field',(field,value)=>{expect(visaPaymentErrors({...valid,[field]:value},'100.00','2030-01-02')[field as keyof typeof valid]).toBeTruthy();});
it('accepts full payment and the expiry month through its last day',()=>{expect(visaPaymentErrors({...valid,amount:'100.00',expiry:'01/30'},'100.00','2030-01-31')).toEqual({});expect(visaPaymentErrors({...valid,expiry:'01/30'},'100.00','2030-02-01').expiry).toBeTruthy();});

it.each([['2','02/'],['226','02/26'],['12','12/'],['139','01/39'],['0126','01/26'],['9','09/'],['926','09/26'],['0','0'],['01','01/'],['1','1'],['10','10/'],['11','11/'],['123456','12/34'],['22699','02/26']])('intelligently masks %s as %s',(value,expected)=>expect(maskExpiry(value)).toBe(expected));
it('supports deletion, correction, paste and prohibited characters without shifting the year',()=>{
 expect(maskExpiry('02/2','02/26')).toBe('02/2');expect(maskExpiry('02/','02/2')).toBe('02/');expect(maskExpiry('02','02/')).toBe('0');expect(maskExpiry('','0')).toBe('');expect(maskExpiry('2/26','02/26')).toBe('2/26');expect(maskExpiry('02/26','2/26')).toBe('02/26');expect(maskExpiry('1226','12/26')).toBe('12/26');expect(maskExpiry('12a/#26')).toBe('12/26');expect(maskExpiry('abc')).toBe('');expect(maskExpiry('13/26','12/26')).toBe('12/26');
 expect(maskHolder('Dra. María2 Ñuñez! @#')).toBe('Dra. María Ñuñez ');expect(maskHolder('Ñ'.repeat(45))).toHaveLength(40);expect(visaPaymentErrors({...valid,holder:'Dra. María Ñuñez'},'100.00','2030-01-02').holder).toBeUndefined();
});
it('uses only the uniform amount message with the current balance and two decimals',()=>{
 for(const amount of ['0','-1','abc','771','770.001'])expect(visaPaymentErrors({...valid,amount},'770.00','2030-01-02').amount).toBe('Debe ingresar un importe entre Q. 0.00 y Q. 770.00.');
 expect(paymentAmountError('25')).toBe('Debe ingresar un importe entre Q. 0.00 y Q. 25.00.');expect(visaPaymentErrors({...valid,amount:'30'},'25.50','2030-01-02').amount).toBe('Debe ingresar un importe entre Q. 0.00 y Q. 25.50.');
});

it('distinguishes replacing a selection by paste from deleting the same separator',()=>{expect(maskExpiry('12','12/',false)).toBe('12/');expect(maskExpiry('12','12/',true)).toBe('1');expect(maskExpiry('2/26','02/26',false)).toBe('02/26');expect(maskExpiry('2/26','02/26',true)).toBe('2/26');});
