'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { emptyGuest, type GuestDetails } from '../domain/guest-details';
import type { DemoBookingConfirmation } from '@/modules/reservations';
import { buildSearchQueryParams, validateBookingSearchCriteria, type BookingSearchCriteria } from '@/modules/booking';

interface Draft { scope: string; guest: GuestDetails; approvedSelection?: string; confirmation?: DemoBookingConfirmation }
const Context = createContext<{ draft: Draft; update: (scope: string, patch: Partial<GuestDetails>) => void; approve: (scope: string, selection: string) => void; complete: (scope: string, selection: string, confirmation: DemoBookingConfirmation) => void } | null>(null);

/** Sensitive form data lives only in memory, never in URL, logs or browser storage. */
export function CheckoutDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>({ scope: '', guest: emptyGuest });
  const update = (scope: string, patch: Partial<GuestDetails>) => setDraft(previous => ({ scope, guest: { ...(previous.scope === scope ? previous.guest : emptyGuest), ...patch } }));
  const approve = (scope: string, selection: string) => setDraft(previous => previous.scope === scope ? { ...previous, approvedSelection: selection } : previous);
  const complete = (scope: string, selection: string, confirmation: DemoBookingConfirmation) => setDraft(previous => previous.scope === scope && previous.approvedSelection === selection && !previous.confirmation ? { ...previous, confirmation } : previous);
  return <Context.Provider value={{ draft, update, approve, complete }}>{children}</Context.Provider>;
}

export function useCheckoutDraft(scope: string) {
  const context = useContext(Context);
  if (!context) throw new Error('CHECKOUT_DRAFT_PROVIDER_REQUIRED');
  return {
    guest: context.draft.scope === scope ? context.draft.guest : emptyGuest,
    approvedSelection: context.draft.scope === scope ? context.draft.approvedSelection : undefined,
    confirmation: context.draft.scope === scope ? context.draft.confirmation : undefined,
    update: (patch: Partial<GuestDetails>) => context.update(scope, patch),
    approve: (selection: string) => context.approve(scope, selection),
    complete: (selection: string, confirmation: DemoBookingConfirmation) => context.complete(scope, selection, confirmation),
  };
}

export function useCheckoutConfirmation(criteria: Partial<BookingSearchCriteria>) {
  const context = useContext(Context);
  if (!context) throw new Error('CHECKOUT_DRAFT_PROVIDER_REQUIRED');
  const confirmation = context.draft.confirmation;
  const valid = Object.keys(validateBookingSearchCriteria(criteria)).length === 0 && confirmation && context.draft.scope === `${confirmation.propertyId}:${buildSearchQueryParams(criteria as BookingSearchCriteria)}`;
  return { confirmation: valid ? confirmation : undefined, guest: valid ? context.draft.guest : emptyGuest };
}
