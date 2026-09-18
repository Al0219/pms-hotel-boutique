import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { type StayService } from '@/modules/stay/data/services/StayService';
import { useCurrentStay } from '@/modules/stay/presentation/hooks/useCurrentStay';
import { stayHomeStyles } from '@/modules/stay/presentation/stayHomeStyles';
import { deriveRemoteState } from '@/state/remoteState';

const serviceActions = [
  { title: 'Limpieza', description: 'Solicitar servicio' },
  { title: 'Room service', description: 'Pedir a la habitación' },
  { title: 'Amenidades', description: 'Explorar el hotel' },
  { title: 'Información', description: 'Wi-Fi, horarios y contacto' },
] as const;

const bottomNavigation = ['Inicio', 'Solicitudes', 'Explorar', 'Hotel'] as const;

function formatStayDate(value: string): string {
  return new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short' })
    .format(new Date(`${value}T12:00:00`))
    .replace('.', '');
}

function StayState({ title, body, testID }: { title: string; body: string; testID: string }) {
  return (
    <View style={stayHomeStyles.state} testID={testID}>
      <Text style={stayHomeStyles.stateTitle}>{title}</Text>
      <Text style={stayHomeStyles.stateBody}>{body}</Text>
    </View>
  );
}

export interface StayHomeScreenProps { service?: StayService; }

/** Presentation-only current-stay home. The request preview has no service behaviour. */
export function StayHomeScreen({ service }: StayHomeScreenProps) {
  const query = useCurrentStay(service);
  const remoteState = deriveRemoteState(query, () => false);

  if (remoteState.kind === 'loading') return <StayState testID="stay-home-loading" title="Cargando estadía" body="Un momento, por favor." />;
  if (remoteState.kind === 'offline') return <StayState testID="stay-home-offline" title="Sin conexión" body="No pudimos cargar tu estadía. Intenta nuevamente cuando recuperes conexión." />;
  if (remoteState.kind === 'error') return <StayState testID="stay-home-error" title="No pudimos cargar tu estadía" body={remoteState.error.message} />;
  if (remoteState.kind === 'empty') return <StayState testID="stay-home-empty" title="No hay una estadía activa" body="Cuando tengas una estadía disponible, aparecerá aquí." />;

  const stay = remoteState.data;
  const roomSummary = stay.room ? `Habitación ${stay.room.number}` : 'Habitación por asignar';
  const stayDates = `${formatStayDate(stay.arrival)}–${formatStayDate(stay.departure)}`;

  return (
    <View style={stayHomeStyles.screen} testID="stay-home-screen">
      <ScrollView contentContainerStyle={stayHomeStyles.content}>
        <Text style={stayHomeStyles.pageTitle}>Mi estadía</Text>
        <Text style={stayHomeStyles.summary}>{`${roomSummary} · ${stayDates}`}</Text>
        <View style={stayHomeStyles.stayCard}>
          <Text style={stayHomeStyles.stayCardEyebrow}>Tu estadía actual</Text>
          <Text style={stayHomeStyles.stayCardTitle}>{stay.roomType.name}</Text>
          <Text style={stayHomeStyles.stayCardDate}>{`Check-out · ${formatStayDate(stay.departure)}`}</Text>
          <Text
            accessibilityLabel={`Estado de estadía: ${stay.status}`}
            style={stayHomeStyles.stayStatus}
            testID="stay-status"
          >
            {stay.status}
          </Text>
          <View style={stayHomeStyles.reference}><Text style={stayHomeStyles.referenceText}>{stay.reservationId}</Text></View>
        </View>
        <Text style={stayHomeStyles.sectionTitle}>¿Qué necesitas?</Text>
        <View style={stayHomeStyles.actionGrid}>
          {serviceActions.map((action) => (
            <Pressable accessibilityHint="Abre Servicios" accessibilityLabel={action.title} accessibilityRole="button" key={action.title} onPress={() => router.push('/services')} style={stayHomeStyles.actionCard}>
              <Text style={stayHomeStyles.actionTitle}>{action.title}</Text>
              <Text style={stayHomeStyles.actionDescription}>{action.description}</Text>
            </Pressable>
          ))}
        </View>
        <View style={stayHomeStyles.requestCard}>
          <Text style={stayHomeStyles.requestHeading}>Solicitud en curso</Text>
          <View style={stayHomeStyles.requestRow}>
            <Text style={stayHomeStyles.requestTitle}>Limpieza de habitación</Text>
            <View style={stayHomeStyles.pendingChip}><Text style={stayHomeStyles.pendingLabel}>Pendiente</Text></View>
          </View>
        </View>
      </ScrollView>
      <View accessibilityLabel="Navegación principal" style={stayHomeStyles.bottomNavigation}>
        {bottomNavigation.map((label) => {
          const isActive = label === 'Inicio';
          return (
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="tab"
              accessibilityState={{ disabled: true, selected: isActive }}
              disabled
              key={label}
              style={[stayHomeStyles.navItem, isActive && stayHomeStyles.navItemActive]}
            >
              <Text style={[stayHomeStyles.navLabel, isActive && stayHomeStyles.navLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
