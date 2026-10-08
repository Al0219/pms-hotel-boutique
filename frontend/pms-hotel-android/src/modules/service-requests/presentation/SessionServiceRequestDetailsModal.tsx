import { Modal, Pressable, Text, View } from 'react-native';

import { type SessionServiceRequest } from '@/modules/service-requests/domain/SessionServiceRequest';
import { sessionServiceRequestStyles as styles } from '@/modules/service-requests/presentation/sessionServiceRequestStyles';

function Detail({ label, value }: { label: string; value?: string }) {
  return value ? <Text style={styles.summary}>{label}: {value}</Text> : null;
}

function formatItems(request: SessionServiceRequest): readonly string[] {
  const details = request.details;
  if (!details || (details.type !== 'ROOM_SERVICE' && details.type !== 'AMENITIES')) return [];
  return details.items.map((item) => {
    const billed = request.billingSnapshot?.lineItems?.find((line) => line.quantity === item.quantity);
    return `${billed?.label ?? item.itemFixtureKey} × ${item.quantity}`;
  });
}

/** Read-only view of the information captured in the session request. */
export function SessionServiceRequestDetailsModal({ onClose, request, visible }: { onClose: () => void; request: SessionServiceRequest; visible: boolean }) {
  const details = request.details;
  const items = formatItems(request);
  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
    <View style={styles.confirmBackdrop}>
      <View accessibilityViewIsModal style={styles.confirmCard} testID={`session-service-request-details-${request.sessionRequestId}`}>
        <Text accessibilityRole="header" style={styles.screenTitle}>{request.title}</Text>
        <Text style={styles.status}>Estado: Completado</Text>
        {request.summary ? <Detail label="Detalle" value={request.summary} /> : null}
        {request.origin === 'CHAT' ? <Detail label="Origen" value="Chat" /> : null}
        {details?.type === 'HOUSEKEEPING' ? <><Detail label="Fecha" value={details.serviceDate} /><Detail label="Franja" value={details.timeSlot} /><Detail label="Tipo de limpieza" value={details.cleaningType} /><Detail label="Notas" value={details.notes} /></> : null}
        {details?.type === 'ROOM_SERVICE' || details?.type === 'AMENITIES' ? <><Detail label="Fecha" value={details.serviceDate} /><Detail label="Hora" value={details.deliveryTime} />{items.map((item) => <Text key={item} style={styles.summary}>{item}</Text>)}<Detail label="Notas" value={details.notes} /></> : null}
        {details?.type === 'VEHICLE_REQUEST' ? <><Detail label="Fecha" value={details.serviceDate} /><Detail label="Hora" value={details.requestedTime} /><Detail label="Vehículo" value={request.summary} /></> : null}
        {details?.type === 'TRANSFER' ? <><Detail label="Destino" value={details.destinationKey} /><Detail label="Pickup" value={details.pickupKey} /><Detail label="Fecha y hora" value={new Date(details.scheduledAtMs).toLocaleString('es-GT')} /><Detail label="Pasajeros" value={String(details.passengers)} /></> : null}
        {details?.type === 'LATE_CHECKOUT' ? <><Detail label="Fecha" value={details.serviceDate} /><Detail label="Hora autorizada" value={details.checkoutUntil} /></> : null}
        {request.billingSnapshot ? <><Detail label={request.billingSnapshot.amountNature === 'ESTIMATED' ? 'Tarifa estimada' : 'Importe'} value={request.billingSnapshot.priceText} />{request.billingSnapshot.lineItems?.map((line) => <Text key={`${line.label}-${line.priceText}`} style={styles.summary}>{line.quantity ? `${line.label} × ${line.quantity}` : line.label} · {line.priceText}</Text>)}</> : null}
        <Pressable accessibilityRole="button" onPress={onClose} style={[styles.editorButton, styles.editorButtonPrimary]} testID={`session-service-request-details-close-${request.sessionRequestId}`}><Text style={[styles.editorButtonLabel, styles.editorButtonLabelPrimary]}>Cerrar</Text></Pressable>
      </View>
    </View>
  </Modal>;
}
