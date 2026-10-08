import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';

import { type ActiveReservationContext } from '@/modules/guest-auth/domain/models/ActiveReservationContext';

interface ActiveReservationContextValue {
  activeReservationContext: ActiveReservationContext | null;
  setActiveReservationContext: (context: ActiveReservationContext) => void;
  clearActiveReservationContext: () => void;
}

export interface ActiveReservationContextProviderProps extends PropsWithChildren {
  initialActiveReservationContext?: ActiveReservationContext | null;
}

const ActiveReservationContextState = createContext<ActiveReservationContextValue | null>(null);

/** In-memory active reservation/stay identity. It intentionally does not contain ReservationStay data. */
export function ActiveReservationContextProvider({ children, initialActiveReservationContext = null }: ActiveReservationContextProviderProps) {
  const [activeReservationContext, updateContext] = useState<ActiveReservationContext | null>(initialActiveReservationContext);
  const setActiveReservationContext = useCallback((context: ActiveReservationContext) => updateContext({ reservationId: context.reservationId, reservationStayId: context.reservationStayId }), []);
  const clearActiveReservationContext = useCallback(() => updateContext(null), []);
  const value = useMemo(() => ({ activeReservationContext, setActiveReservationContext, clearActiveReservationContext }), [activeReservationContext, clearActiveReservationContext, setActiveReservationContext]);
  return <ActiveReservationContextState.Provider value={value}>{children}</ActiveReservationContextState.Provider>;
}

export function useActiveReservationContext(): ActiveReservationContextValue {
  const value = useContext(ActiveReservationContextState);
  if (!value) throw new Error('useActiveReservationContext must be used inside ActiveReservationContextProvider');
  return value;
}
