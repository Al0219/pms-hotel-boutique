import {environment} from '@/config/environment';
import {InvoiceScreen,RealInvoiceScreen} from '@/modules/checkout';
export default function Route(){return environment.useMockApi?<InvoiceScreen/>:<RealInvoiceScreen/>;}
