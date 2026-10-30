import {ActionLabel} from '@/shared/components/ActionLabel';
import {useRef,useState} from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import {visaPaymentErrors,maskVisa,maskExpiry,maskAmount,maskHolder,normaliseHolder,type VisaFields,type VisaErrors} from '../domain/syntheticPayment';
import type {SimulatedPaymentInput} from '../domain/StayJourney';
import {journeyStyles as s} from './journeyStyles';
/** Raw card fields are ephemeral. Only the synthetic token and amount leave this component. */
export function SyntheticPaymentForm({balance,today,busy,onSubmit}:{balance:string;today:string;busy:boolean;onSubmit:(input:SimulatedPaymentInput)=>void}){
 const expiryDeleting=useRef(false);
 const [fields,setFields]=useState<VisaFields>({number:'',expiry:'',cvv:'',holder:'',amount:balance}),[errors,setErrors]=useState<VisaErrors>({});
 function change(key:keyof VisaFields,value:string){const next={...fields,[key]:value};setFields(next);if(errors[key])setErrors({...errors,[key]:visaPaymentErrors(next,balance,today)[key]});}
 function submit(){const next={...fields,holder:normaliseHolder(fields.holder)},invalid=visaPaymentErrors(next,balance,today);setFields(next);setErrors(invalid);if(busy||Object.keys(invalid).length)return;setFields({...next,number:'',expiry:'',cvv:'',holder:''});onSubmit({amount:next.amount,currency:'GTQ',instrumentToken:'demo_visa_approved'});}
 function field(key:keyof VisaFields,label:string,placeholder:string){const error=key==='amount'&&errors.amount?visaPaymentErrors(fields,balance,today).amount:errors[key];return <View style={{flex:1,gap:4}}><Text style={[s.body,(key==='expiry'||key==='cvv')&&{minHeight:42}]}>{label}</Text><View style={key==='amount'?s.amountInput:undefined}>{key==='amount'?<Text style={s.body}>Q.</Text>:null}<TextInput accessibilityLabel={label} autoComplete="off" textContentType="none" placeholder={placeholder} value={fields[key]} style={[s.input,key==='amount'&&{flex:1,borderWidth:0}]} editable={!busy} keyboardType={key==='holder'?'default':key==='amount'?'decimal-pad':'number-pad'} secureTextEntry={key==='cvv'} maxLength={key==='number'?19:key==='expiry'?5:key==='cvv'?3:key==='holder'?40:18} onBlur={()=>{const next={...fields,holder:normaliseHolder(fields.holder)};setFields(next);setErrors({...errors,[key]:visaPaymentErrors(next,balance,today)[key]});}} onKeyPress={key==='expiry'?event=>{expiryDeleting.current=event.nativeEvent.key==='Backspace';}:undefined} onChangeText={value=>{const deleting=expiryDeleting.current;expiryDeleting.current=false;change(key,key==='number'?maskVisa(value):key==='expiry'?maskExpiry(value,fields.expiry,deleting):key==='cvv'?value.replace(/\D/g,'').slice(0,3):key==='amount'?maskAmount(value,fields.amount):maskHolder(value));}}/></View>{error?<Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>:null}</View>;}
 return <View style={s.card} testID="journey-payment-form"><Text style={s.muted}>Pago de demostración · Solo Visa ficticia</Text>
  {field('number','Número de tarjeta ficticia','4242 4242 4242 4242')}
  <View style={s.row}>{field('expiry','Vencimiento MM/AA','12/26')}{field('cvv','CVV ficticio','123')}</View>
  {field('holder','Titular de prueba','María López')}{field('amount','Importe GTQ','650.00')}
  <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{disabled:busy}} onPress={submit} style={[s.button,busy&&s.disabled]} testID="journey-payment-submit"><ActionLabel label="Confirmar" textStyle={s.buttonText}/></Pressable>
 </View>;
}
