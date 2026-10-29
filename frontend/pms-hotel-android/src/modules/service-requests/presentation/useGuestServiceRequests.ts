import { useCallback,useEffect,useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useQuery, type QueryKey } from '@tanstack/react-query';
import { environment } from '@/config/environment';
/** Shared server-state cadence for visible Guest request lists; no copied data or global synchronization. */
export function useGuestServiceRequests<T extends {status:string}>({queryKey,enabled,queryFn}:{queryKey:QueryKey;enabled:boolean;queryFn:()=>Promise<T[]>}) {
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(() => AppState.currentState === 'active');
  useEffect(() => {
    if (environment.useMockApi) return;
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  const query=useQuery({queryKey,enabled,queryFn,retry:false,staleTime:0,
    refetchIntervalInBackground: false,
    refetchInterval: current => enabled && focused && foreground
      // Pause every observer's interval during a shared fetch, then restart from its result.
      // Account and My services therefore share one cadence as well as one query/promise.
      && current.state.fetchStatus === 'idle'
      && current.state.data?.some(request => request.status === 'OPEN' || request.status === 'IN_PROGRESS')
      ? 10_000 : false,
  });
  const { refetch } = query;
  useFocusEffect(useCallback(() => {
    setFocused(true);
    // Foreground changes rerun this focused effect, including when returning from Staff/other apps.
    if (enabled && foreground) void refetch({ cancelRefetch: false });
    return () => setFocused(false);
  }, [enabled, foreground, refetch]));
  return query;
}
