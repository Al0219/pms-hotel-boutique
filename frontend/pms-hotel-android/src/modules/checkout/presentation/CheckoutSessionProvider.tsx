import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { type CheckoutContent, type Folio } from '@/modules/checkout/domain/Checkout';
export interface CheckoutSessionSnapshot { content: CheckoutContent; folio: Folio; departureNoteText?: string; referenceText: string; generatedAt: Date; }
const Context=createContext<{ snapshot: CheckoutSessionSnapshot | null; createSnapshot: (content: CheckoutContent, folio: Folio, departureNoteText?: string) => void } | null>(null);
export function CheckoutSessionProvider({children}: PropsWithChildren) { const [snapshot,setSnapshot]=useState<CheckoutSessionSnapshot|null>(null); const createSnapshot=useCallback((content:CheckoutContent,folio:Folio,departureNoteText?:string)=>setSnapshot({content:{...content,checks:[...content.checks]},folio:{...folio,items:folio.items.map((item)=>({...item,lineItems:item.lineItems?.map((line)=>({...line}))}))},departureNoteText,generatedAt:new Date(),referenceText:`Referencia de sesión · CHK-${Date.now()}`}),[]); const value=useMemo(()=>({snapshot,createSnapshot}),[createSnapshot,snapshot]); return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useCheckoutSession(){const value=useContext(Context);if(!value)throw new Error('useCheckoutSession must be used inside CheckoutSessionProvider');return value;}
/** Public Guest-side status. It is intentionally false outside the Guest provider for isolated feature tests. */
export function useCheckoutStatus(){return{isCheckedOut:useContext(Context)?.snapshot != null};}
