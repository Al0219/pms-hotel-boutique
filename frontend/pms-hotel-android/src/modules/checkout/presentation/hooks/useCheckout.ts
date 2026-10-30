import {environment} from '@/config/environment';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MockCheckoutService } from '@/modules/checkout/data/mocks/MockCheckoutService';
import { type CheckoutService } from '@/modules/checkout/data/services/CheckoutService';
import { type CheckoutRequest } from '@/modules/checkout/domain/Checkout';
const service = environment.useMockApi ? new MockCheckoutService() : undefined;
function required(service?:CheckoutService):CheckoutService{if(!service)throw new Error('Checkout requires the real HTTP journey');return service;}
export function useFolio(override: CheckoutService | undefined = service) { return useQuery({ queryKey: ['checkout', 'folio'], queryFn: () => required(override).getFolio(), retry: false }); }
export function useCheckoutContent(override: CheckoutService | undefined = service) { return useQuery({ queryKey: ['checkout', 'content'], queryFn: () => required(override).getCheckout(), retry: false }); }
export function useInvoice(override: CheckoutService | undefined = service) { return useQuery({ queryKey: ['checkout', 'invoice'], queryFn: () => required(override).getInvoice(), retry: false }); }
export function useSubmitCheckout(override: CheckoutService | undefined = service) { return useMutation({ mutationFn: (input: CheckoutRequest) => required(override).submitCheckout(input), retry: false }); }
export function useInvoiceActions(override: CheckoutService | undefined = service) { return { pdf: useMutation({ mutationFn: () => required(override).generateInvoicePdf(), retry: false }), email: useMutation({ mutationFn: () => required(override).sendInvoiceEmail(), retry: false }) }; }
