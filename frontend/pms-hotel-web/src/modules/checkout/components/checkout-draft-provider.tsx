'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { emptyGuest, type GuestDetails } from '../domain/guest-details';

interface Draft { scope: string; guest: GuestDetails; approvedSelection?: string }
const Context = createContext<{ draft: Draft; update: (scope: string, patch: Partial<GuestDetails>) => void; approve: (scope: string, selection: string) => void } | null>(null);

/** Sensitive form data lives only in memory, never in URL, logs or browser storage. */
export function CheckoutDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>({ scope: '', guest: emptyGuest });
  const update = (scope: string, patch: Partial<GuestDetails>) => setDraft(previous => ({ scope, guest: { ...(previous.scope === scope ? previous.guest : emptyGuest), ...patch } }));
  const approve = (scope: string, selection: string) => setDraft(previous => previous.scope === scope ? { ...previous, approvedSelection: selection } : previous);
  return <Context.Provider value={{ draft, update, approve }}>{children}</Context.Provider>;
}

export function useCheckoutDraft(scope: string) {
  const context = useContext(Context);
  if (!context) throw new Error('CHECKOUT_DRAFT_PROVIDER_REQUIRED');
  return {
    guest: context.draft.scope === scope ? context.draft.guest : emptyGuest,
    approvedSelection: context.draft.scope === scope ? context.draft.approvedSelection : undefined,
    update: (patch: Partial<GuestDetails>) => context.update(scope, patch),
    approve: (selection: string) => context.approve(scope, selection),
  };
}
