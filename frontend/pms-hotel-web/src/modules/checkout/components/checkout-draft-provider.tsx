'use client';

import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { emptyGuest, type GuestDetails } from '../domain/guest-details';
import type { DemoBookingConfirmation } from '@/modules/reservations';
import { buildSearchQueryParams, validateBookingSearchCriteria, type BookingSearchCriteria } from '@/modules/booking';
import { CheckoutAttemptError, type BookingFailure } from '../domain/booking-failure';

interface Draft { scope: string; guest: GuestDetails; approvedSelection?: string; reviewedQuote?: string; confirmation?: DemoBookingConfirmation; failure?: BookingFailure }
const Context = createContext<{ draft: Draft; update: (scope: string, patch: Partial<GuestDetails>) => void; approve: (scope: string, selection: string) => void; reviewQuote: (scope: string, selection: string, quote: string) => void; complete: (scope: string, selection: string, confirmation: DemoBookingConfirmation) => void; fail: (scope: string, failure: BookingFailure) => void; attemptKey: (scope: string, payload: string) => string; hasUnresolvedAttempt: boolean; reset: () => void } | null>(null);

/** Sensitive form data lives only in memory, never in URL, logs or browser storage. */
export function CheckoutDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>({ scope: '', guest: emptyGuest });
  const [hasUnresolvedAttempt, setHasUnresolvedAttempt] = useState(false);
  const attempt = useRef<{ scope: string; payload: string; key: string; unresolved?: boolean } | null>(null);
  const update = (scope: string, patch: Partial<GuestDetails>) => setDraft(previous => ({ scope, guest: { ...(previous.scope === scope ? previous.guest : emptyGuest), ...patch } }));
  const approve = (scope: string, selection: string) => setDraft(previous => previous.scope === scope ? { ...previous, approvedSelection: selection, reviewedQuote: undefined } : previous);
  const reviewQuote = (scope: string, selection: string, quote: string) => setDraft(previous => previous.scope === scope && previous.approvedSelection === selection ? { ...previous, reviewedQuote: quote } : previous);
  const complete = (scope: string, selection: string, confirmation: DemoBookingConfirmation) => {
    if (attempt.current?.scope === scope) { attempt.current.unresolved = false; setHasUnresolvedAttempt(false); }
    setDraft(previous => previous.scope === scope && previous.approvedSelection === selection && !previous.confirmation ? { ...previous, confirmation, failure: undefined } : previous);
  };
  const fail = (scope: string, failure: BookingFailure) => {
    if (attempt.current?.scope === scope) { attempt.current.unresolved = failure.outcomeUnknown; setHasUnresolvedAttempt(failure.outcomeUnknown); }
    setDraft(previous => previous.scope === scope && !previous.confirmation ? { ...previous, failure } : previous);
  };
  const attemptKey = (scope: string, payload: string) => {
    if (attempt.current?.unresolved && (attempt.current.scope !== scope || attempt.current.payload !== payload)) throw new CheckoutAttemptError('unknown', 'Necesitamos verificar el intento anterior antes de confirmar con otros datos.');
    if (attempt.current?.scope !== scope || attempt.current.payload !== payload) attempt.current = { scope, payload, key: crypto.randomUUID() };
    return attempt.current.key;
  };
  const reset = () => { attempt.current = null; setHasUnresolvedAttempt(false); setDraft({ scope: '', guest: emptyGuest }); };
  return <Context.Provider value={{ draft, update, approve, reviewQuote, complete, fail, attemptKey, hasUnresolvedAttempt, reset }}>{children}</Context.Provider>;
}

export function useCheckoutDraft(scope: string) {
  const context = useContext(Context);
  if (!context) throw new Error('CHECKOUT_DRAFT_PROVIDER_REQUIRED');
  return {
    guest: context.draft.scope === scope ? context.draft.guest : emptyGuest,
    approvedSelection: context.draft.scope === scope ? context.draft.approvedSelection : undefined,
    reviewedQuote: context.draft.scope === scope ? context.draft.reviewedQuote : undefined,
    confirmation: context.draft.scope === scope ? context.draft.confirmation : undefined,
    failure: context.draft.scope === scope ? context.draft.failure : undefined,
    update: (patch: Partial<GuestDetails>) => context.update(scope, patch),
    approve: (selection: string) => context.approve(scope, selection),
    reviewQuote: (selection: string, quote: string) => context.reviewQuote(scope, selection, quote),
    complete: (selection: string, confirmation: DemoBookingConfirmation) => context.complete(scope, selection, confirmation),
    fail: (failure: BookingFailure) => context.fail(scope, failure),
    attemptKey: (payload: string) => context.attemptKey(scope, payload),
    hasUnresolvedAttempt: context.hasUnresolvedAttempt,
  };
}

export function useCheckoutFailure(criteria: Partial<BookingSearchCriteria>) {
  const context = useContext(Context);
  if (!context) throw new Error('CHECKOUT_DRAFT_PROVIDER_REQUIRED');
  const failure = context.draft.failure;
  const valid = Object.keys(validateBookingSearchCriteria(criteria)).length === 0 && failure && context.draft.scope === `${failure.propertyId}:${buildSearchQueryParams(criteria as BookingSearchCriteria)}`;
  return { failure: valid ? failure : undefined, guest: valid ? context.draft.guest : emptyGuest };
}

export function useResetCheckout() {
  const context = useContext(Context);
  if (!context) throw new Error('CHECKOUT_DRAFT_PROVIDER_REQUIRED');
  return context.reset;
}

export function useCheckoutConfirmation(criteria: Partial<BookingSearchCriteria>) {
  const context = useContext(Context);
  if (!context) throw new Error('CHECKOUT_DRAFT_PROVIDER_REQUIRED');
  const confirmation = context.draft.confirmation;
  const valid = Object.keys(validateBookingSearchCriteria(criteria)).length === 0 && confirmation && context.draft.scope === `${confirmation.propertyId}:${buildSearchQueryParams(criteria as BookingSearchCriteria)}`;
  return { confirmation: valid ? confirmation : undefined, guest: valid ? context.draft.guest : emptyGuest };
}
