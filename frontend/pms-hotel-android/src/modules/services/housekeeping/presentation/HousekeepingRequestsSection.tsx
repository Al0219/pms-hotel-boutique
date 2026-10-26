import { Pressable, Text, View } from 'react-native';
import { NetworkError } from '@/data/remote/http/HttpError';
import { formatGuestDate } from '@/shared/components';
import { sessionServiceRequestStyles as styles } from '@/modules/service-requests/presentation/sessionServiceRequestStyles';
import { housekeepingStatusLabels } from '../domain/PersistedHousekeepingRequest';
import { useHousekeepingRequests } from './hooks/useHousekeepingRequests';

/** Persisted read-only cards: never inserted into the session-only request provider. */
export function HousekeepingRequestsSection({ filter = 'ALL' }: { filter?: 'ALL' | 'ACTIVE' | 'COMPLETED' | 'REQUESTED' | 'ASSIGNED' }) {
  const query = useHousekeepingRequests();
  const refresh = <Pressable accessibilityRole="button" disabled={query.isFetching} onPress={() => void query.refetch()} testID="housekeeping-requests-refresh"><Text style={styles.summary}>Actualizar solicitudes de limpieza</Text></Pressable>;
  if (query.isPending) return <Text accessibilityLiveRegion="polite" testID="housekeeping-requests-loading">Cargando solicitudes de limpieza…</Text>;
  if (query.isError) return <View testID="housekeeping-requests-error"><Text>{query.error instanceof NetworkError ? 'Sin conexión. Conéctate para consultar tus solicitudes.' : 'No pudimos consultar tus solicitudes de limpieza.'}</Text>{refresh}</View>;
  const rows = (query.data ?? []).filter(item => filter === 'ALL' || (filter === 'ACTIVE' ? ['OPEN', 'IN_PROGRESS'].includes(item.status) : filter === 'COMPLETED' ? item.status === 'DONE' : filter === 'REQUESTED' ? item.status === 'OPEN' : false));
  return <View testID="housekeeping-requests-real">{refresh}{rows.length === 0 ? <Text style={styles.empty}>Sin solicitudes de limpieza.</Text> : rows.map(item => <View key={item.id} style={styles.card} testID={`housekeeping-request-${item.id}`}><View style={styles.cardBody}><Text style={styles.title}>Limpieza completa</Text><Text style={styles.summary}>{formatGuestDate(item.serviceDate)} · {item.timeSlot}</Text>{item.notes ? <Text style={styles.summary}>{item.notes}</Text> : null}<Text style={styles.status}>{housekeepingStatusLabels[item.status]}</Text></View></View>)}</View>;
}
