import { useEffect, useMemo, useState } from 'react';
import { PanResponder, Pressable, Text, View, type LayoutChangeEvent } from 'react-native';

import { type SessionServiceRequest } from '@/modules/service-requests/domain/SessionServiceRequest';
import { canCompleteServiceRequest, canModifyServiceRequest, getServiceRequestCompletionEligibleAt } from '@/modules/service-requests/domain/serviceRequestPresentation';
import { sessionServiceRequestStyles as styles } from '@/modules/service-requests/presentation/sessionServiceRequestStyles';
import { ConfirmationModal } from '@/shared/components';

export function sessionServiceRequestStatusText(status: SessionServiceRequest['status']): string {
  if (status === 'ASSIGNED') return 'Asignado por el hotel';
  if (status === 'COMPLETED') return 'Completado';
  return 'Solicitado';
}

export function sessionServiceRequestEditPath(request: SessionServiceRequest): '/services/housekeeping' | '/services/room-service' | '/valet' | '/services/requests' {
  if (request.kind === 'HOUSEKEEPING') return '/services/housekeeping';
  if (request.kind === 'ROOM_SERVICE') return '/services/room-service';
  if (request.kind === 'VEHICLE_REQUEST' || request.kind === 'TRANSFER') return '/valet';
  return '/services/requests';
}

export function getSessionRequestSwipeRevealDistance(cardWidth: number): number { return cardWidth / 2; }

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
  const [deleteRevealed, setDeleteRevealed] = useState(false);
  const [completionConfirmVisible, setCompletionConfirmVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteCutoffFeedback, setDeleteCutoffFeedback] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);
  const panResponder = useMemo(() => !modifiable || !onRemove ? null : PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx <= -(cardWidth || 72) / 4) setDeleteRevealed(true);
      if (gesture.dx >= (cardWidth || 72) / 4) setDeleteRevealed(false);
    },
  }), [cardWidth, modifiable, onRemove]);
  const confirmRemove = () => setDeleteConfirmVisible(true);
  const confirmComplete = () => setCompletionConfirmVisible(true);
  const onLayout = (event: LayoutChangeEvent) => setCardWidth(event.nativeEvent.layout.width);
  const revealDistance = deleteRevealed ? getSessionRequestSwipeRevealDistance(cardWidth) : 0;
  return <><View {...panResponder?.panHandlers} onLayout={onLayout} style={styles.swipeRow} testID={`session-service-request-${request.sessionRequestId}`}>
    {onRemove && modifiable && deleteRevealed ? <Pressable accessibilityLabel={`Eliminar ${request.title}`} accessibilityRole="button" onPress={confirmRemove} style={[styles.removeButton, { width: revealDistance }]} testID={`remove-session-service-request-${request.sessionRequestId}`}><Text style={styles.removeLabel}>🗑</Text></Pressable> : null}
    <View style={[styles.card, { transform: [{ translateX: -revealDistance }] }]}>
      <Pressable accessibilityLabel={editable ? editLabel : undefined} accessibilityRole={editable ? 'button' : undefined} onPress={editable ? () => onEdit?.(request) : undefined} style={styles.cardBody} testID={`edit-session-service-request-${request.sessionRequestId}`}>
        <Text style={styles.title}>{request.title}</Text>{request.summary ? <Text style={styles.summary}>{request.summary}</Text> : null}<Text style={styles.status}>{sessionServiceRequestStatusText(request.status)}</Text>
      </Pressable>
      {completable ? <Pressable accessibilityHint={completionHint} accessibilityLabel={completionLabel} accessibilityRole="button" accessibilityState={{ disabled: !completionAllowed }} disabled={!completionAllowed} onPress={confirmComplete} style={[styles.completeButton, !completionAllowed && styles.completeButtonDisabled]} testID={`complete-session-service-request-${request.sessionRequestId}`}><Text style={styles.completeLabel}>✓</Text></Pressable> : null}
    </View></View>
    <ConfirmationModal body={request.kind === 'VEHICLE_REQUEST' ? '¿Confirmas que ya recibiste tu vehículo?' : '¿Quieres marcar este servicio como completado?'} confirmLabel="Confirmar" onCancel={() => setCompletionConfirmVisible(false)} onConfirm={() => { setCompletionConfirmVisible(false); onComplete?.(request); }} testID={`complete-session-service-request-modal-${request.sessionRequestId}`} title={request.kind === 'VEHICLE_REQUEST' ? 'Vehículo recibido' : 'Completar servicio'} visible={completionConfirmVisible} />
    <ConfirmationModal body="¿Quieres eliminar este servicio de Mis servicios?" confirmLabel="Eliminar" destructive onCancel={() => setDeleteConfirmVisible(false)} onConfirm={() => { setDeleteConfirmVisible(false); if (onRemove?.(request.sessionRequestId) === false) setDeleteCutoffFeedback(true); }} testID={`remove-session-service-request-modal-${request.sessionRequestId}`} title="Eliminar servicio" visible={deleteConfirmVisible} />
    {deleteCutoffFeedback ? <Text accessibilityLiveRegion="polite" style={styles.summary} testID={`remove-session-service-request-cutoff-${request.sessionRequestId}`}>Ya no puedes eliminar este servicio porque está próximo a su horario.</Text> : null}
  </>;
}
