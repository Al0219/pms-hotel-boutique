import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CheckoutDraftProvider, useCheckoutDraft, useResetCheckout } from './checkout-draft-provider';

describe('Checkout unresolved attempt', () => {
  it('keeps an uncertain key across guest edits and rejects a changed payload until explicit reset', () => {
    const { result } = renderHook(() => ({ draft: useCheckoutDraft('property:search'), reset: useResetCheckout() }), { wrapper: CheckoutDraftProvider });
    act(() => result.current.draft.update({ firstName: 'Carlos' }));
    const key = result.current.draft.attemptKey('payload-a');
    act(() => result.current.draft.fail({ kind: 'network', message: 'Response lost', outcomeUnknown: true, propertyId: 'property', roomNames: ['Deluxe King'], card: { token: 'demo_visa_approved', brand: 'Visa', last4: '4242', holderName: 'Carlos' } }));
    expect(result.current.draft.attemptKey('payload-a')).toBe(key);
    act(() => result.current.draft.update({ email: 'corrected@example.com' }));
    expect(result.current.draft.failure).toBeUndefined(); expect(result.current.draft.hasUnresolvedAttempt).toBe(true); expect(() => result.current.draft.attemptKey('payload-b')).toThrow('verificar el intento anterior');
    act(() => result.current.reset()); expect(result.current.draft.hasUnresolvedAttempt).toBe(false); expect(result.current.draft.attemptKey('payload-b')).not.toBe(key); expect(result.current.draft.guest.firstName).toBe('');
  });
});
