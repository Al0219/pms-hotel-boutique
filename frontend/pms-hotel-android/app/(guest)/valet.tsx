import {environment} from '@/config/environment';
import {ValetScreen,RealValetScreen} from '@/modules/valet';
export default function ValetRoute(){return environment.useMockApi?<ValetScreen/>:<RealValetScreen/>;}
