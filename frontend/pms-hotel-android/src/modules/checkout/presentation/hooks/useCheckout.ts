import { useMutation, useQuery } from '@tanstack/react-query';
import { MockCheckoutService } from '@/modules/checkout/data/mocks/MockCheckoutService';
import { type CheckoutService } from '@/modules/checkout/data/services/CheckoutService';
import { type CheckoutRequest } from '@/modules/checkout/domain/Checkout';
const service = new MockCheckoutService();
export function useFolio(override: CheckoutService = service) { return useQuery({ queryKey: ['checkout', 'folio'], queryFn: () => override.getFolio(), retry: false }); }
export function useCheckoutContent(override: CheckoutService = service) { return useQuery({ queryKey: ['checkout', 'content'], queryFn: () => override.getCheckout(), retry: false }); }
export function useInvoice(override: CheckoutService = service) { return useQuery({ queryKey: ['checkout', 'invoice'], queryFn: () => override.getInvoice(), retry: false }); }
export function useSubmitCheckout(override: CheckoutService = service) { return useMutation({ mutationFn: (input: CheckoutRequest) => override.submitCheckout(input), retry: false }); }
export function useInvoiceActions(override: CheckoutService = service) { return { pdf: useMutation({ mutationFn: () => override.generateInvoicePdf(), retry: false }), email: useMutation({ mutationFn: () => override.sendInvoiceEmail(), retry: false }) }; }
