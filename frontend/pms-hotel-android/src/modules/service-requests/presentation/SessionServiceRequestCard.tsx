import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { type SessionServiceRequest } from '@/modules/service-requests/domain/SessionServiceRequest';
import { canCancelLateCheckoutRequest, canCompleteServiceRequest, canModifyServiceRequest, getLateCheckoutCancellationBlockReason, getServiceRequestCompletionEligibleAt } from '@/modules/service-requests/domain/serviceRequestPresentation';
import { SessionServiceRequestDetailsModal } from '@/modules/service-requests/presentation/SessionServiceRequestDetailsModal';
import { sessionServiceRequestStyles as styles } from '@/modules/service-requests/presentation/sessionServiceRequestStyles';
import { ConfirmationModal, SwipeToDelete, getSwipeToDeleteRevealDistance } from '@/shared/components';
import { useAppClock } from '@/shared/time';

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

export function SessionServiceRequestCard({ nowMs, onComplete, onEdit, onRemove, readOnly = false, request, requests = [] }: { nowMs?: number; onComplete?: (request: SessionServiceRequest) => void; onEdit?: (request: SessionServiceRequest) => void; onRemove?: (sessionRequestId: string) => boolean | void; readOnly?: boolean; request: SessionServiceRequest; requests?: readonly SessionServiceRequest[] }) {
  const appClock = useAppClock();
  const editLabel = `Editar ${request.title}`;
  const [, setTimeCheckVersion] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTimeCheckVersion((current) => current + 1), 30_000);
    return () => clearInterval(timer);
  }, []);
  const currentTime = nowMs ?? appClock.nowMs();
  const modifiable = canModifyServiceRequest(request, currentTime);
  const lateCancellationReason = request.kind === 'LATE_CHECKOUT' ? getLateCheckoutCancellationBlockReason(request, currentTime, requests) : null;
  const removable = !readOnly && (request.kind === 'LATE_CHECKOUT' ? canCancelLateCheckoutRequest(request, currentTime, requests) : modifiable);
  const completed = request.status === 'COMPLETED';
  const editable = !readOnly && Boolean(onEdit && modifiable && request.kind !== 'LATE_CHECKOUT');
  const completionEligibleAt = getServiceRequestCompletionEligibleAt(request);
  const completable = !readOnly && request.status !== 'COMPLETED' && completionEligibleAt !== null && Boolean(onComplete);
  const completionAllowed = completable && canCompleteServiceRequest(request, currentTime);
  const completionLabel = request.kind === 'VEHICLE_REQUEST' ? 'Marcar vehículo como recibido' : `Marcar ${request.title} como completado`;
  const completionHint = completionEligibleAt !== null && !completionAllowed ? `Disponible después de ${new Date(completionEligibleAt).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false })}` : undefined;
  const [completionConfirmVisible, setCompletionConfirmVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteCutoffFeedback, setDeleteCutoffFeedback] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const confirmRemove = () => { if (!readOnly) setDeleteConfirmVisible(true); };
  const confirmComplete = () => { if (!readOnly) setCompletionConfirmVisible(true); };
  if (completed) return <><Pressable accessibilityLabel={`Ver detalles de ${request.title}`} accessibilityRole="button" onPress={() => setDetailsVisible(true)} style={styles.card} testID={`session-service-request-${request.sessionRequestId}`}><View style={styles.cardBody}><Text style={styles.title}>{request.title}</Text>{request.summary ? <Text style={styles.summary}>{request.summary}</Text> : null}<Text style={styles.status}>{sessionServiceRequestStatusText(request.status)}</Text></View></Pressable><SessionServiceRequestDetailsModal onClose={() => setDetailsVisible(false)} request={request} visible={detailsVisible} /></>;
  return <>{onRemove && removable ? <SwipeToDelete deleteLabel={`Eliminar ${request.title}`} onDelete={confirmRemove} testID={`session-service-request-${request.sessionRequestId}`}><View style={styles.card}>
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
    <ConfirmationModal body={request.kind === 'VEHICLE_REQUEST' ? '¿Confirmas que ya recibiste tu vehículo?' : '¿Quieres marcar este servicio como completado?'} confirmLabel="Confirmar" onCancel={() => setCompletionConfirmVisible(false)} onConfirm={() => { setCompletionConfirmVisible(false); if (!readOnly) onComplete?.(request); }} testID={`complete-session-service-request-modal-${request.sessionRequestId}`} title={request.kind === 'VEHICLE_REQUEST' ? 'Vehículo recibido' : 'Completar servicio'} visible={!readOnly && completionConfirmVisible} />
    <ConfirmationModal body="¿Quieres eliminar este servicio de Mis servicios?" confirmLabel="Eliminar" destructive onCancel={() => setDeleteConfirmVisible(false)} onConfirm={() => { setDeleteConfirmVisible(false); if (!readOnly && onRemove?.(request.sessionRequestId) === false) setDeleteCutoffFeedback(true); }} testID={`remove-session-service-request-modal-${request.sessionRequestId}`} title="Eliminar servicio" visible={!readOnly && deleteConfirmVisible} />
    {!readOnly && onRemove && request.kind === 'LATE_CHECKOUT' && !removable ? <Text accessibilityLiveRegion="polite" style={styles.summary} testID={`remove-session-service-request-cutoff-${request.sessionRequestId}`}>{lateCancellationReason === 'DEPENDENT_SERVICE_AFTER_NORMAL_CHECKOUT' ? 'Este Late check-out no puede cancelarse porque tienes servicios programados después de la hora de salida normal.' : 'Ya no puedes cancelar el Late check-out porque faltan menos de 30 minutos para la hora de salida normal.'}</Text> : null}
    {deleteCutoffFeedback ? <Text accessibilityLiveRegion="polite" style={styles.summary} testID={`remove-session-service-request-cutoff-${request.sessionRequestId}`}>{request.kind === 'LATE_CHECKOUT' ? 'Ya no puedes cancelar el Late check-out porque faltan menos de 30 minutos para la hora de salida normal.' : 'Ya no puedes eliminar este servicio porque está próximo a su horario.'}</Text> : null}
  </>;
}
