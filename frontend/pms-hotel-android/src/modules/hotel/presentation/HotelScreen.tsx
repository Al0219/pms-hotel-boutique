import {useCallback} from 'react';
import {useFocusEffect} from 'expo-router';
import {useGuestAuthSession} from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import {useActiveReservationContext} from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import {useLinkedReservations} from '@/modules/guest-auth/presentation/hooks/useLinkedReservations';
import {useCurrentStay} from '@/modules/stay/presentation/hooks/useCurrentStay';
import type {ReservationStay} from '@/modules/stay/domain/models/ReservationStay';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { type ReactNode } from 'react';

import { getHotelProfile } from '@/modules/hotel/data/services/hotelProfileContent';
import { type HotelProfile } from '@/modules/hotel/domain/HotelProfile';
import { GuestNavigationShell, GuestRootHeader } from '@/modules/navigation';
import { tokens } from '@/shared/theme/tokens';

export interface HotelScreenProps {
  demonstration?: boolean;
  profile?: HotelProfile;
  stay?: ReservationStay;
  hotelName?: string;
  reference?: string;
  stayError?: boolean;
}

function HotelInfoCard({ children, testID, title }: { children: ReactNode; testID: string; title: string }) {
  return (
    <View style={styles.card} testID={testID}>
      <Text accessibilityRole="header" style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

/** Selected-stay data comes from existing authenticated boundaries; demo contact is independent. */
export function ConnectedHotelScreen() {
  const {session} = useGuestAuthSession();
  const {activeReservationContext: context} = useActiveReservationContext();
  const current = useCurrentStay(undefined, session ? context : null);
  const linked = useLinkedReservations(session?.accountId);
  const {refetch: refreshStay} = current, {refetch: refreshLinked} = linked;
  useFocusEffect(useCallback(() => {
    if (session?.accountId && context) {void refreshStay({cancelRefetch: false}); void refreshLinked({cancelRefetch: false});}
  }, [session?.accountId, context, refreshStay, refreshLinked]));
  const reservation = linked.isSuccess && session ? linked.data.find(row => row.reservationId === context?.reservationId && row.reservationStayId === context?.reservationStayId) : undefined;
  const stay = reservation && current.isSuccess && current.data.id === context?.reservationStayId && current.data.reservationId === context?.reservationId ? current.data : undefined;
  return <HotelScreen hotelName={reservation?.propertyLabel ?? 'Hotel'} reference={reservation?.reference} stay={stay} stayError={current.isError || linked.isError} />;
}

export function HotelScreen({ profile = getHotelProfile(), hotelName = profile.name, stay, reference, stayError = false }: HotelScreenProps) {
  const statusLabels: Record<string,string> = {RESERVED: 'Pendiente de entrada', IN_HOUSE: 'En curso', CHECKED_OUT: 'Finalizada', CANCELLED: 'Cancelada', NO_SHOW: 'No presentada'};
  const status = stay ? statusLabels[stay.status] ?? stay.status : null;
  return (
    <View style={styles.screen} testID="hotel-screen">
      <GuestRootHeader title={hotelName} />
      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
        <View style={styles.hero} testID="hotel-hero">
          {status ? <Text accessibilityLabel={status} style={styles.statusIndicator} testID="hotel-status-indicator">{status}</Text> : null}
          {stay ? <Text style={styles.description}>{stay.roomType.name}</Text> : null}
        </View>
        <HotelInfoCard testID="hotel-stay-info" title="Tu estadía">
          {stay ? <><Text style={styles.body}>{stay.room ? `Habitación · ${stay.room.number}` : 'Habitación por asignar'}</Text>
          <Text style={styles.body}>{`Llegada · ${stay.arrival}`}</Text>
          <Text style={styles.body}>{`Salida · ${stay.departure}`}</Text>
          {reference || stay.confirmationCode ? <Text style={styles.body}>{`Reserva · ${reference ?? stay.confirmationCode}`}</Text> : null}</> : <Text style={styles.body}>{stayError ? 'No pudimos consultar la estancia.' : '—'}</Text>}
        </HotelInfoCard>
        <HotelInfoCard testID="hotel-wifi" title="Wi‑Fi">
          <Text style={styles.body}>{`Red · ${profile.wifi.ssid}`}</Text>
          <Text style={styles.body}>{`Contraseña · ${profile.wifi.password}`}</Text>
        </HotelInfoCard>
        <HotelInfoCard testID="hotel-contact" title="Contacto">
          <Text style={styles.body}>{profile.contact.phone}</Text>
          <Text style={styles.body}>{profile.contact.email}</Text>
        </HotelInfoCard>
        <HotelInfoCard testID="hotel-location" title="Ubicación">
          <Text style={styles.body}>{profile.address}</Text>
        </HotelInfoCard>
      </ScrollView>
      <GuestNavigationShell />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: tokens.color.surface, flex: 1 },
  scroll: { flex: 1 },
  content: { gap: tokens.space.md, padding: tokens.layout.screenInset, paddingBottom: tokens.space.xxl },
  hero: { gap: tokens.space.sm },
  statusIndicator: { alignSelf: 'flex-start', backgroundColor: tokens.color.pendingSurface, borderRadius: tokens.radius.chip, color: tokens.color.pendingText, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.body, fontWeight: '600', paddingHorizontal: tokens.space.sm, paddingVertical: tokens.space.xs },
  description: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium, lineHeight: tokens.typography.size.bodyMedium * 1.5 },
  card: { backgroundColor: tokens.color.white, borderColor: tokens.color.border, borderRadius: tokens.radius.card, borderWidth: 1, gap: tokens.space.xs, padding: tokens.space.md },
  cardTitle: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
  body: { color: tokens.color.ink, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium, lineHeight: tokens.typography.size.bodyMedium * 1.5 },
});
