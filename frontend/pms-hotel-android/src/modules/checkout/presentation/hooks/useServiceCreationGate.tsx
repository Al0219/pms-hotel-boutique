import {Text} from 'react-native';
import {environment} from '@/config/environment';
import {useRealStayJourney} from './useRealStayJourney';
function useHttpServiceCreationGate(){const j=useRealStayJourney();const closed=j.state.data?.stay.status==='CHECKED_OUT'||j.state.data?.requests.some(r=>r.kind==='CHECK_OUT'&&r.status==='OPEN');return{blocked:!environment.useMockApi&&(!j.state.isSuccess||!!closed),message:!environment.useMockApi&&closed?'Ya solicitaste tu salida. No puedes pedir más servicios.':!environment.useMockApi&&j.state.isError?'No se pudo verificar la disponibilidad de servicios.':''};}
function useMockServiceCreationGate(){return{blocked:false,message:''};}
export const useServiceCreationGate=environment.useMockApi?useMockServiceCreationGate:useHttpServiceCreationGate;
function AutomaticNotice(){const gate=useServiceCreationGate();return <ServiceCreationNotice message={gate.message}/>;}
export function ServiceCreationNotice({message}:{message?:string}){return message===undefined?<AutomaticNotice/>:message?<Text accessibilityLiveRegion="polite">{message}</Text>:null;}
