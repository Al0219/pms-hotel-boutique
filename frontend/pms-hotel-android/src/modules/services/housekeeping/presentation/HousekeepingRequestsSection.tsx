import { ServiceRequestDisclosure, ServiceRequestDisclosureGroup } from '@/modules/service-requests/presentation/ServiceRequestDisclosure';
import { filterPersistedServiceRequests,type ServiceRequestFilter } from '@/modules/service-requests/domain/serviceRequestPresentation';
import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { HttpError, NetworkError } from '@/data/remote/http/HttpError';
import { ConfirmationModal, SwipeToDelete, formatGuestDate } from '@/shared/components';
import { useAppClock } from '@/shared/time';
import { sessionServiceRequestStyles as styles } from '@/modules/service-requests/presentation/sessionServiceRequestStyles';
import { canModifyPersistedHousekeeping, housekeepingStatusLabels, type PersistedHousekeepingRequest } from '../domain/PersistedHousekeepingRequest';
import { useHousekeepingRequests } from './hooks/useHousekeepingRequests';
import { useCancelHousekeeping } from './hooks/useCancelHousekeeping';

/** Backend is the sole authority; Guest can edit/cancel OPEN requests, never mark them DONE. */
export function HousekeepingRequestsSection({filter='ALL'}:{filter?:ServiceRequestFilter}) {
  const query=useHousekeepingRequests();
  return <HousekeepingRequestsContent query={query} filter={filter}/>;
}
/** The composed list supplies the existing query, so cards add no observer or HTTP read. */
export function HousekeepingRequestsContent({query,filter='ALL',showFeedback=true}:{query:ReturnType<typeof useHousekeepingRequests>;filter?:ServiceRequestFilter;showFeedback?:boolean}) {
  const cancellation = useCancelHousekeeping();
  const clock = useAppClock();
  const [target, setTarget] = useState<PersistedHousekeepingRequest | null>(null);
  const [, tick] = useState(0);
  const inFlight = useRef(false);
  useEffect(() => { const timer = setInterval(() => tick(value => value + 1), 30_000); return () => clearInterval(timer); }, []);
  const conflict = cancellation.error instanceof HttpError && cancellation.error.status === 409;
  const offline = cancellation.error instanceof NetworkError;
  const refresh = <Pressable accessibilityRole="button" disabled={query.isFetching} onPress={() => { cancellation.reset(); void query.refetch(); }} testID="housekeeping-requests-refresh"><Text style={styles.summary}>Actualizar solicitudes de limpieza</Text></Pressable>;
  function confirmCancel() {
    if (!target || inFlight.current) return;
    if (!canModifyPersistedHousekeeping(target, clock.nowMs())) { setTarget(null); void query.refetch(); return; }
    inFlight.current = true;
    cancellation.mutate(target, { onSuccess: () => setTarget(null), onError: error => { if (error instanceof HttpError && error.status === 409) setTarget(null); }, onSettled: () => { inFlight.current = false; } });
  }
  if (showFeedback && query.isPending) return <Text accessibilityLiveRegion="polite" testID="housekeeping-requests-loading">Cargando solicitudes de limpieza…</Text>;
  if (showFeedback && query.isError && !target) return <View testID="housekeeping-requests-error"><Text>{query.error instanceof NetworkError ? 'Sin conexión. Conéctate para consultar tus solicitudes.' : 'No pudimos consultar tus solicitudes de limpieza.'}</Text>{refresh}</View>;
  const rows = filterPersistedServiceRequests(query.data??[],filter);
  return <ServiceRequestDisclosureGroup scope={filter}><View testID="housekeeping-requests-real">{showFeedback?refresh:null}
    {cancellation.isError && !target ? <Text accessibilityLiveRegion="polite" testID="housekeeping-cancel-error">{conflict ? 'La solicitud cambió o ya no admite cancelación. Actualiza las solicitudes.' : offline ? 'Sin conexión. Reintenta la cancelación.' : 'No pudimos cancelar la solicitud. Reintenta.'}</Text> : null}
    {rows.length === 0 ? showFeedback?<Text style={styles.empty}>Sin solicitudes de limpieza.</Text>:null : rows.map(item => {
      const editable = canModifyPersistedHousekeeping(item, clock.nowMs());
      const card = <ServiceRequestDisclosure key={item.id} id={`housekeeping:${item.id}`} title="Limpieza completa"
        summary={`${formatGuestDate(item.serviceDate)} · ${item.timeSlot}`} status={housekeepingStatusLabels[item.status]} testID={`housekeeping-request-${item.id}`}
        edit={editable ? { label:'Editar solicitud de limpieza',testID:`housekeeping-edit-${item.id}`,disabled:cancellation.isPending,
          onPress:() => router.push({ pathname:'/services/housekeeping',params:{ editRequestId:item.id,returnTo:'requests' } }) } : undefined}>
        {item.notes ? <Text style={styles.summary}>{item.notes}</Text> : null}
      </ServiceRequestDisclosure>;
      return editable ? <SwipeToDelete key={item.id} deleteLabel="Cancelar solicitud" enabled={!cancellation.isPending} onDelete={() => { if (canModifyPersistedHousekeeping(item, clock.nowMs())) { cancellation.reset(); setTarget(item); } }} testID={`housekeeping-swipe-${item.id}`}>{card}</SwipeToDelete> : card;
    })}
    <ConfirmationModal visible={target !== null} title="Cancelar solicitud" body={cancellation.isError ? offline ? 'Sin conexión. Conéctate y reintenta.' : 'No pudimos confirmar la cancelación. Reintenta.' : '¿Quieres cancelar esta solicitud de limpieza? Permanecerá en tu historial.'}
      confirmLabel={cancellation.isPending ? 'Cancelando…' : cancellation.isError ? 'Reintentar cancelación' : 'Cancelar solicitud'} destructive testID="housekeeping-cancel-confirmation"
      onCancel={() => { if (!cancellation.isPending) { setTarget(null); cancellation.reset(); } }} onConfirm={confirmCancel} />
  </View></ServiceRequestDisclosureGroup>;
}
