import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { type ReactNode } from 'react';

import { getHotelProfile } from '@/modules/hotel/data/services/hotelProfileContent';
import { type HotelProfile } from '@/modules/hotel/domain/HotelProfile';
import { GuestNavigationShell, GuestRootHeader } from '@/modules/navigation';
import { tokens } from '@/shared/theme/tokens';

export interface HotelScreenProps {
  profile?: HotelProfile;
}

function HotelInfoCard({ children, testID, title }: { children: ReactNode; testID: string; title: string }) {
  return (
    <View style={styles.card} testID={testID}>
      <Text accessibilityRole="header" style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

/** Standalone Hotel presentation over a central, static frontend/mock profile. */
export function HotelScreen({ profile = getHotelProfile() }: HotelScreenProps) {
  return (
    <View style={styles.screen} testID="hotel-screen">
      <GuestRootHeader title={profile.name} />
      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
        <View style={styles.hero} testID="hotel-hero">
          <Text accessibilityLabel={profile.statusLabel} style={styles.demoIndicator} testID="hotel-demo-indicator">{profile.statusLabel}</Text>
          <Text style={styles.description}>{profile.description}</Text>
        </View>
        <HotelInfoCard testID="hotel-stay-info" title="Tu estadía">
          <Text style={styles.body}>{`Check-in · ${profile.checkInTime}`}</Text>
          <Text style={styles.body}>{`Check-out · ${profile.checkOutTime}`}</Text>
          <Text style={styles.body}>{`Recepción · ${profile.receptionHours}`}</Text>
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
  demoIndicator: { alignSelf: 'flex-start', backgroundColor: tokens.color.pendingSurface, borderRadius: tokens.radius.chip, color: tokens.color.pendingText, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.body, fontWeight: '600', paddingHorizontal: tokens.space.sm, paddingVertical: tokens.space.xs },
  description: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium, lineHeight: tokens.typography.size.bodyMedium * 1.5 },
  card: { backgroundColor: tokens.color.white, borderColor: tokens.color.border, borderRadius: tokens.radius.card, borderWidth: 1, gap: tokens.space.xs, padding: tokens.space.md },
  cardTitle: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
  body: { color: tokens.color.ink, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium, lineHeight: tokens.typography.size.bodyMedium * 1.5 },
});
