import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { QueryClientContext } from '@tanstack/react-query';
import { environment } from '@/config/environment';
import { guestAuthService } from '@/modules/guest-auth/data/services/guestServices';
import { nativeGuestClient } from '@/modules/guest-auth/data/http/NativeGuestClient';
import { UniversalState } from '@/shared/components/UniversalState';
import { NetworkError } from '@/data/remote/http/HttpError';

import { type GuestAuthSession } from '@/modules/guest-auth/domain/models/GuestAuthSession';

interface GuestAuthSessionContextValue {
  session: GuestAuthSession | null;
  sessionExpired: boolean;
  beginSession: (session: GuestAuthSession) => void;
  clearSession: () => void;
}

export interface GuestAuthSessionProviderProps extends PropsWithChildren {
  initialSession?: GuestAuthSession | null;
}

const GuestAuthSessionContext = createContext<GuestAuthSessionContextValue | null>(null);

/** Restores native credentials before protected children mount. Domain session contains no tokens. */
export function GuestAuthSessionProvider({ children, initialSession = null }: GuestAuthSessionProviderProps) {
  const [session, setSession] = useState<GuestAuthSession | null>(initialSession);
  const queryClient = useContext(QueryClientContext);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [restoring, setRestoring] = useState(!environment.useMockApi && initialSession === null);
  const [restoreError, setRestoreError] = useState<Error | null>(null);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  useEffect(() => {
    if (environment.useMockApi || initialSession) return;
    let mounted = true;
    const unsubscribe = nativeGuestClient.onExpired(() => {
      if (!mounted) return;
      setSession(null);
      setSessionExpired(true);
      queryClient?.clear();
    });
    guestAuthService.restore?.().then((restored) => {
      if (mounted) setSession(restored);
    }).catch((error: Error) => { if (mounted) setRestoreError(error); })
      .finally(() => { if (mounted) setRestoring(false); });
    return () => { mounted = false; unsubscribe(); };
  }, [initialSession, queryClient, restoreAttempt]);
  const beginSession = useCallback((nextSession: GuestAuthSession) => { setSessionExpired(false); setSession({ accountId: nextSession.accountId }); }, []);
  const clearSession = useCallback(() => setSession(null), []);
  const value = useMemo(() => ({ session, sessionExpired, beginSession, clearSession }), [beginSession, clearSession, session, sessionExpired]);
  if (restoring) return <UniversalState kind="loading" title="Recuperando sesión" testID="guest-session-restoring" />;
  if (restoreError) return <UniversalState kind={restoreError instanceof NetworkError ? 'offline' : 'error'} title="No pudimos recuperar tu sesión" body="Revisa la conexión y la configuración del servidor." retry={{ label: 'Reintentar', onPress: () => { setRestoring(true); setRestoreError(null); setRestoreAttempt((value) => value + 1); } }} testID="guest-session-restore-error" />;
  return <GuestAuthSessionContext.Provider value={value}>{children}</GuestAuthSessionContext.Provider>;
}

export function useGuestAuthSession(): GuestAuthSessionContextValue {
  const value = useContext(GuestAuthSessionContext);
  if (!value) throw new Error('useGuestAuthSession must be used inside GuestAuthSessionProvider');
  return value;
}
