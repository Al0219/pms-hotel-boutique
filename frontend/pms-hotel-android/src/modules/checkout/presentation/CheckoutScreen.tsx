import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { NetworkError } from '@/data/remote/http/HttpError';
import { type CheckoutService } from '@/modules/checkout/data/services/CheckoutService';
import { buildCheckoutSessionReadModel } from '@/modules/checkout/domain/CheckoutSessionReadModel';
import { useCheckoutSession } from '@/modules/checkout/presentation/CheckoutSessionProvider';
import { useSubmitCheckout } from '@/modules/checkout/presentation/hooks/useCheckout';
import { GuestChildHeader } from '@/modules/navigation';
import { useSessionServiceRequests } from '@/modules/service-requests';
import { useCurrentStay } from '@/modules/stay/presentation/hooks/useCurrentStay';
import { type StayService } from '@/modules/stay';
import { ConfirmationModal } from '@/shared/components';
import { tokens } from '@/shared/theme/tokens';
import { useAppClock } from '@/shared/time';

function back() { router.dismissTo('/account'); }

function State({ offline, onRetry, title }: { offline?: boolean; onRetry: () => void; title: string }) {
  return <View style={[styles.card, offline && styles.offline]}><Text style={styles.heading}>{title}</Text><Pressable accessibilityLabel="Reintentar" accessibilityRole="button" onPress={onRetry} style={styles.button}><Text style={styles.buttonText}>Reintentar</Text></Pressable></View>;
}

function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function startOfLocalDay(value: Date): Date { return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }

export function CheckoutScreen({ now, service, stayService }: { now?: () => Date; service?: CheckoutService; stayService?: StayService }) {
  const appClock = useAppClock();
  const getNow = now ?? appClock.getNow;
  const stayQuery = useCurrentStay(stayService);
  const { requests } = useSessionServiceRequests();
  const read = stayQuery.data ? buildCheckoutSessionReadModel(stayQuery.data, requests) : null;
  const { createSnapshot, snapshot } = useCheckoutSession();
  const submit = useSubmitCheckout(service);
  const [notes, setNotes] = useState('');
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const initialized = useRef(false);
  const inFlight = useRef(false);

  useEffect(() => {
    if (read && !initialized.current) {
      setNotes(read.content.departureNoteText);
      initialized.current = true;
    }
  }, [read]);

  const departure = stayQuery.data ? parseLocalDate(stayQuery.data.departure) : null;
  const checkoutAvailable = departure !== null && startOfLocalDay(getNow()).getTime() >= departure.getTime();
  const offline = submit.error instanceof NetworkError;

  function openConfirmation() {
    if (!checkoutAvailable || submit.isPending || snapshot) return;
    setConfirmationVisible(true);
  }

  function confirmCheckout() {
    if (!checkoutAvailable || submit.isPending || inFlight.current || snapshot || !read) return;
    inFlight.current = true;
    const departureNoteText = notes.trim();
    submit.mutate(departureNoteText ? { departureNoteText } : {}, {
      onSuccess: (result) => {
        if (result.completed) {
          createSnapshot(read.content, read.folio, departureNoteText || undefined);
          router.replace('/account/invoice');
        }
      },
      onSettled: () => {
        inFlight.current = false;
        setConfirmationVisible(false);
      },
    });
  }

  return <View style={styles.screen} testID="checkout-screen">
    <GuestChildHeader backAccessibilityLabel="Volver a inicio" backTestID="checkout-back" onBack={back} title="Check-out" />
    <ScrollView contentContainerStyle={styles.content}>
      {snapshot ? <View style={styles.card} testID="checkout-completed"><Text style={styles.heading}>Check-out completado</Text><Pressable accessibilityRole="button" onPress={() => router.replace('/account/invoice')} style={styles.button} testID="checkout-view-invoice"><Text style={styles.buttonText}>Ver factura</Text></Pressable></View>
        : stayQuery.isLoading ? <View testID="checkout-loading"><Text style={styles.heading}>Cargando Check-out</Text></View>
          : stayQuery.error instanceof NetworkError ? <State offline onRetry={() => void stayQuery.refetch()} title="Sin conexión" />
            : stayQuery.isError ? <State onRetry={() => void stayQuery.refetch()} title="No pudimos cargar Check-out" />
              : read ? <>
                <View style={styles.card} testID="checkout-folio">
                  <Text style={styles.heading}>Folio</Text>
                  <Text style={styles.body}>{read.folio.totalStayText}</Text>
                  {read.folio.items.map((item) => <View key={item.key} style={styles.row}><Text style={styles.body}>{item.label}</Text><Text style={styles.body}>{item.priceText}</Text></View>)}
                  <Text style={styles.body} testID="checkout-total">{read.folio.checkoutTotal?.text ?? read.folio.totalText}</Text>
                </View>
                <View style={styles.card}><Text style={styles.heading}>{read.content.roomDisplayText}</Text><Text style={styles.body}>{read.content.stayDatesText}</Text><Text style={styles.body}>{read.content.expectedDepartureText}</Text></View>
                <Text accessibilityRole="header" style={styles.heading}>Nota de salida</Text>
                <TextInput accessibilityLabel="Nota de salida" multiline onChangeText={setNotes} style={styles.notes} testID="checkout-departure-note" value={notes} />
                {departure === null ? <Text style={styles.body} testID="checkout-departure-unavailable">Fecha de salida no disponible</Text> : !checkoutAvailable ? <Text style={styles.body} testID="checkout-before-departure">El check-out estará disponible el {stayQuery.data!.departure}</Text> : null}
                <Pressable accessibilityLabel="Confirmar Check-out" accessibilityRole="button" accessibilityState={{ disabled: !checkoutAvailable || submit.isPending }} disabled={!checkoutAvailable || submit.isPending} onPress={openConfirmation} style={[styles.button, (!checkoutAvailable || submit.isPending) && styles.disabled]} testID="checkout-submit"><Text style={styles.buttonText}>{submit.isPending ? 'Finalizando estancia...' : 'Confirmar Check-out'}</Text></Pressable>
                {submit.isError ? <State offline={offline} onRetry={openConfirmation} title={offline ? 'Sin conexión' : 'No pudimos confirmar Check-out'} /> : null}
              </> : null}
    </ScrollView>
    <ConfirmationModal body="Al confirmar el check-out ya no podrás solicitar nuevos servicios de habitación." confirmLabel="Finalizar estancia" onCancel={() => setConfirmationVisible(false)} onConfirm={confirmCheckout} testID="checkout-confirmation" title="¿Finalizar estancia?" visible={confirmationVisible} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: tokens.color.surface, flex: 1 },
  content: { gap: tokens.space.md, padding: tokens.layout.screenInset },
  card: { backgroundColor: tokens.color.white, borderColor: tokens.color.border, borderRadius: tokens.radius.card, borderWidth: 1, gap: tokens.space.sm, padding: tokens.space.md },
  offline: { backgroundColor: tokens.color.pendingSurface },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  heading: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.sectionTitle, fontWeight: '600' },
  body: { color: tokens.color.ink, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
  notes: { backgroundColor: tokens.color.white, borderColor: tokens.color.border, borderRadius: tokens.radius.control, borderWidth: 1, color: tokens.color.ink, fontFamily: tokens.typography.family, minHeight: tokens.layout.controlHeight * 2, padding: tokens.space.sm, textAlignVertical: 'top' },
  button: { alignItems: 'center', backgroundColor: tokens.color.brand, borderRadius: tokens.radius.control, minHeight: tokens.layout.buttonHeight, justifyContent: 'center', paddingHorizontal: tokens.space.md },
  disabled: { backgroundColor: tokens.color.brandSoft },
  buttonText: { color: tokens.color.white, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
});
