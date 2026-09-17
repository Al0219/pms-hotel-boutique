import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useReducer, useRef } from 'react';

import { type AddSessionServiceRequestInput, type SessionServiceRequest } from '@/modules/service-requests/domain/SessionServiceRequest';
import { canCompleteServiceRequest, canModifyServiceRequest } from '@/modules/service-requests/domain/serviceRequestPresentation';

interface SessionServiceRequestsState {
  requests: readonly SessionServiceRequest[];
  dedupeKeys: readonly string[];
}

type SessionServiceRequestsAction =
  | { type: 'ADD_REQUEST'; request: SessionServiceRequest; dedupeKey?: string }
  | { type: 'UPDATE_REQUEST'; sessionRequestId: string; request: Omit<AddSessionServiceRequestInput, 'dedupeKey'> }
  | { type: 'COMPLETE_REQUEST'; sessionRequestId: string }
  | { type: 'REMOVE_REQUEST'; sessionRequestId: string };

export const initialSessionServiceRequestsState: SessionServiceRequestsState = { requests: [], dedupeKeys: [] };

/** Pure append-only reducer for the current Guest tree. */
export function sessionServiceRequestsReducer(state: SessionServiceRequestsState, action: SessionServiceRequestsAction): SessionServiceRequestsState {
  if (action.type === 'COMPLETE_REQUEST') return { ...state, requests: state.requests.map((request) => request.sessionRequestId === action.sessionRequestId ? { ...request, status: 'COMPLETED' } : request) };
  if (action.type === 'REMOVE_REQUEST') return { ...state, requests: state.requests.filter((request) => request.sessionRequestId !== action.sessionRequestId) };
  if (action.type === 'UPDATE_REQUEST') return {
    ...state,
    requests: state.requests.map((request) => request.sessionRequestId === action.sessionRequestId ? {
      ...request,
      ...action.request,
      sessionRequestId: request.sessionRequestId,
      createdAtMs: request.createdAtMs,
      billingSnapshot: action.request.billingSnapshot ?? request.billingSnapshot,
    } : request),
  };
  if (action.dedupeKey && state.dedupeKeys.includes(action.dedupeKey)) return state;

  return {
    requests: [...state.requests, action.request].sort((left, right) => right.createdAtMs - left.createdAtMs),
    dedupeKeys: action.dedupeKey ? [...state.dedupeKeys, action.dedupeKey] : state.dedupeKeys,
  };
}

interface SessionServiceRequestsContextValue {
  requests: readonly SessionServiceRequest[];
  addRequest: (input: AddSessionServiceRequestInput) => void;
  updateRequest: (sessionRequestId: string, input: Omit<AddSessionServiceRequestInput, 'dedupeKey'>) => boolean;
  removeRequest: (sessionRequestId: string) => boolean;
  completeRequest: (sessionRequestId: string) => boolean;
}

const SessionServiceRequestsContext = createContext<SessionServiceRequestsContextValue | null>(null);

/** One in-memory registry for all Guest feature routes; it intentionally has no persistence. */
export function SessionServiceRequestsProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(sessionServiceRequestsReducer, initialSessionServiceRequestsState);
  const sequence = useRef(0);
  const lastCreatedAtMs = useRef(0);

  const addRequest = useCallback((input: AddSessionServiceRequestInput) => {
    sequence.current += 1;
    const createdAtMs = Math.max(Date.now(), lastCreatedAtMs.current + 1);
    lastCreatedAtMs.current = createdAtMs;
    const { dedupeKey, ...requestInput } = input;
    dispatch({ type: 'ADD_REQUEST', dedupeKey, request: { ...requestInput, createdAtMs, sessionRequestId: `session-request-${sequence.current}` } });
  }, []);
  const updateRequest = useCallback((sessionRequestId: string, input: Omit<AddSessionServiceRequestInput, 'dedupeKey'>) => {
    const existing = state.requests.find((request) => request.sessionRequestId === sessionRequestId);
    if (!existing || !canModifyServiceRequest(existing, Date.now())) return false;
    dispatch({ type: 'UPDATE_REQUEST', sessionRequestId, request: input });
    return true;
  }, [state.requests]);
  const removeRequest = useCallback((sessionRequestId: string) => {
    const existing = state.requests.find((request) => request.sessionRequestId === sessionRequestId);
    if (!existing || !canModifyServiceRequest(existing, Date.now())) return false;
    dispatch({ type: 'REMOVE_REQUEST', sessionRequestId });
    return true;
  }, [state.requests]);
  const completeRequest = useCallback((sessionRequestId: string) => {
    const existing = state.requests.find((request) => request.sessionRequestId === sessionRequestId);
    if (!existing || !canCompleteServiceRequest(existing, Date.now())) return false;
    dispatch({ type: 'COMPLETE_REQUEST', sessionRequestId });
    return true;
  }, [state.requests]);

  const value = useMemo(() => ({ addRequest, completeRequest, removeRequest, requests: state.requests, updateRequest }), [addRequest, completeRequest, removeRequest, state.requests, updateRequest]);

  return <SessionServiceRequestsContext.Provider value={value}>{children}</SessionServiceRequestsContext.Provider>;
}

export function useSessionServiceRequests(): SessionServiceRequestsContextValue {
  const context = useContext(SessionServiceRequestsContext);
  if (!context) throw new Error('useSessionServiceRequests must be used inside SessionServiceRequestsProvider');
  return context;
}
