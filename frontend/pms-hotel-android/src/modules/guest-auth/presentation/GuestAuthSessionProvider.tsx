import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';

import { type GuestAuthSession } from '@/modules/guest-auth/domain/models/GuestAuthSession';

interface GuestAuthSessionContextValue {
  session: GuestAuthSession | null;
  beginSession: (session: GuestAuthSession) => void;
  clearSession: () => void;
}

export interface GuestAuthSessionProviderProps extends PropsWithChildren {
  initialSession?: GuestAuthSession | null;
}

const GuestAuthSessionContext = createContext<GuestAuthSessionContextValue | null>(null);

/** In-memory only. Cold starts intentionally begin with no authenticated Guest session. */
export function GuestAuthSessionProvider({ children, initialSession = null }: GuestAuthSessionProviderProps) {
  const [session, setSession] = useState<GuestAuthSession | null>(initialSession);
  const beginSession = useCallback((nextSession: GuestAuthSession) => setSession({ accountId: nextSession.accountId }), []);
  const clearSession = useCallback(() => setSession(null), []);
  const value = useMemo(() => ({ session, beginSession, clearSession }), [beginSession, clearSession, session]);
  return <GuestAuthSessionContext.Provider value={value}>{children}</GuestAuthSessionContext.Provider>;
}

export function useGuestAuthSession(): GuestAuthSessionContextValue {
  const value = useContext(GuestAuthSessionContext);
  if (!value) throw new Error('useGuestAuthSession must be used inside GuestAuthSessionProvider');
  return value;
}
