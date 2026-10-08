import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';

export type GuestServiceNotice = { type: 'SERVICE_REQUEST_SUCCESS'; mode: 'CREATED' | 'UPDATED' };
type GuestNoticeContextValue = { notice: GuestServiceNotice | null; showServiceRequestSuccess: (mode?: GuestServiceNotice['mode']) => void; dismissNotice: () => void };
const detachedValue: GuestNoticeContextValue = { notice: null, showServiceRequestSuccess: () => undefined, dismissNotice: () => undefined };
const GuestNoticeContext = createContext<GuestNoticeContextValue>(detachedValue);

/** Guest-session presentation notice. It is intentionally transient and never persisted. */
export function GuestNoticeProvider({ children }: PropsWithChildren) {
  const [notice, setNotice] = useState<GuestServiceNotice | null>(null);
  const showServiceRequestSuccess = useCallback((mode: GuestServiceNotice['mode'] = 'CREATED') => setNotice({ type: 'SERVICE_REQUEST_SUCCESS', mode }), []);
  const dismissNotice = useCallback(() => setNotice(null), []);
  const value = useMemo<GuestNoticeContextValue>(() => ({ notice, showServiceRequestSuccess, dismissNotice }), [dismissNotice, notice, showServiceRequestSuccess]);
  return <GuestNoticeContext.Provider value={value}>{children}</GuestNoticeContext.Provider>;
}
export function useGuestNotice(): GuestNoticeContextValue {
  const context = useContext(GuestNoticeContext);
  return context;
}
