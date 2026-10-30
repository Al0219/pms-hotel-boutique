import {environment} from '@/config/environment';
import {CheckoutScreen,RealCheckoutScreen} from '@/modules/checkout';
export default function Route(){return environment.useMockApi?<CheckoutScreen/>:<RealCheckoutScreen/>;}
