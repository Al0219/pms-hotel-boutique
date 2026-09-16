import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { type SessionServiceRequest } from '@/modules/service-requests/domain/SessionServiceRequest';
import { canCompleteServiceRequest, canModifyServiceRequest, getServiceRequestCompletionEligibleAt } from '@/modules/service-requests/domain/serviceRequestPresentation';
import { sessionServiceRequestStyles as styles } from '@/modules/service-requests/presentation/sessionServiceRequestStyles';
import { ConfirmationModal, SwipeToDelete, getSwipeToDeleteRevealDistance } from '@/shared/components';

export function sessionServiceRequestStatusText(status: SessionServiceRequest['status']): string {
  if (status === 'ASSIGNED') return 'Asignado por el hotel';
  if (status === 'COMPLETED') return 'Completado';
  return 'Solicitado';
}

export function sessionServiceRequestEditPath(request: SessionServiceRequest): '/services/housekeeping' | '/services/room-service' | '/services/amenities' | '/valet' | '/services/requests' {
  if (request.kind === 'HOUSEKEEPING') return '/services/housekeeping';
  if (request.kind === 'ROOM_SERVICE') return '/services/room-service';
  if (request.kind === 'AMENITIES') return '/services/amenities';
  if (request.kind === 'VEHICLE_REQUEST' || request.kind === 'TRANSFER') return '/valet';
  return '/services/requests';
}

export function getSessionRequestSwipeRevealDistance(cardWidth: number): number { return getSwipeToDeleteRevealDistance(cardWidth); }

export function SessionServiceRequestCard({ nowMs, onComplete, onEdit, onRemove, request }: { nowMs?: number; onComplete?: (request: SessionServiceRequest) => void; onEdit?: (request: SessionServiceRequest) => void; onRemove?: (sessionRequestId: string) => boolean | void; request: SessionServiceRequest }) {
  const editLabel = `Editar ${request.title}`;
  const [renderedAtMs, setRenderedAtMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setRenderedAtMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const currentTime = nowMs ?? renderedAtMs;
  const modifiable = canModifyServiceRequest(request, currentTime);
  const editable = Boolean(onEdit && modifiable && request.kind !== 'LATE_CHECKOUT');
  const completionEligibleAt = getServiceRequestCompletionEligibleAt(request);
  const completable = request.status !== 'COMPLETED' && completionEligibleAt !== null && Boolean(onComplete);
  const completionAllowed = completable && canCompleteServiceRequest(request, currentTime);
  const completionLabel = request.kind === 'VEHICLE_REQUEST' ? 'Marcar vehículo como recibido' : `Marcar ${request.title} como completado`;
  const completionHint = completionEligibleAt !== null && !completionAllowed ? `Disponible después de ${new Date(completionEligibleAt).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false })}` : undefined;
  const [completionConfirmVisible, setCompletionConfirmVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteCutoffFeedback, setDeleteCutoffFeedback] = useState(false);
  const confirmRemove = () => setDeleteConfirmVisible(true);
  const confirmComplete = () => setCompletionConfirmVisible(true);
  return <>{onRemove && modifiable ? <SwipeToDelete deleteLabel={`Eliminar ${request.title}`} onDelete={confirmRemove} testID={`session-service-request-${request.sessionRequestId}`}><View style={styles.card}>
      <Pressable accessibilityLabel={editable ? editLabel : undefined} accessibilityRole={editable ? 'button' : undefined} onPress={editable ? () => onEdit?.(request) : undefined} style={styles.cardBody} testID={`edit-session-service-request-${request.sessionRequestId}`}>
        <Text style={styles.title}>{request.title}</Text>{request.summary ? <Text style={styles.summary}>{request.summary}</Text> : null}<Text style={styles.status}>{sessionServiceRequestStatusText(request.status)}</Text>
      </Pressable>
      {completable ? <Pressable accessibilityHint={completionHint} accessibilityLabel={completionLabel} accessibilityRole="button" accessibilityState={{ disabled: !completionAllowed }} disabled={!completionAllowed} onPress={confirmComplete} style={[styles.completeButton, !completionAllowed && styles.completeButtonDisabled]} testID={`complete-session-service-request-${request.sessionRequestId}`}><Text style={styles.completeLabel}>✓</Text></Pressable> : null}
    </View></SwipeToDelete> : <View style={styles.card}>
      <Pressable accessibilityLabel={editable ? editLabel : undefined} accessibilityRole={editable ? 'button' : undefined} onPress={editable ? () => onEdit?.(request) : undefined} style={styles.cardBody} testID={`edit-session-service-request-${request.sessionRequestId}`}>
        <Text style={styles.title}>{request.title}</Text>{request.summary ? <Text style={styles.summary}>{request.summary}</Text> : null}<Text style={styles.status}>{sessionServiceRequestStatusText(request.status)}</Text>
      </Pressable>
      {completable ? <Pressable accessibilityHint={completionHint} accessibilityLabel={completionLabel} accessibilityRole="button" accessibilityState={{ disabled: !completionAllowed }} disabled={!completionAllowed} onPress={confirmComplete} style={[styles.completeButton, !completionAllowed && styles.completeButtonDisabled]} testID={`complete-session-service-request-${request.sessionRequestId}`}><Text style={styles.completeLabel}>✓</Text></Pressable> : null}
    </View>}
    <ConfirmationModal body={request.kind === 'VEHICLE_REQUEST' ? '¿Confirmas que ya recibiste tu vehículo?' : '¿Quieres marcar este servicio como completado?'} confirmLabel="Confirmar" onCancel={() => setCompletionConfirmVisible(false)} onConfirm={() => { setCompletionConfirmVisible(false); onComplete?.(request); }} testID={`complete-session-service-request-modal-${request.sessionRequestId}`} title={request.kind === 'VEHICLE_REQUEST' ? 'Vehículo recibido' : 'Completar servicio'} visible={completionConfirmVisible} />
    <ConfirmationModal body="¿Quieres eliminar este servicio de Mis servicios?" confirmLabel="Eliminar" destructive onCancel={() => setDeleteConfirmVisible(false)} onConfirm={() => { setDeleteConfirmVisible(false); if (onRemove?.(request.sessionRequestId) === false) setDeleteCutoffFeedback(true); }} testID={`remove-session-service-request-modal-${request.sessionRequestId}`} title="Eliminar servicio" visible={deleteConfirmVisible} />
    {deleteCutoffFeedback ? <Text accessibilityLiveRegion="polite" style={styles.summary} testID={`remove-session-service-request-cutoff-${request.sessionRequestId}`}>Ya no puedes eliminar este servicio porque está próximo a su horario.</Text> : null}
  </>;
}
