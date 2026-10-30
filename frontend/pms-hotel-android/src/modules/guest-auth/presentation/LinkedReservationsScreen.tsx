import { SymbolView } from 'expo-symbols';
import {filterLinkedReservations, validFilterDate, type StayFilter} from '../domain/filterLinkedReservations';
import {valetContinuation} from './guestContinuation';
import { environment } from "@/config/environment";
import { useGuestLogout } from "@/modules/guest-auth/presentation/hooks/useGuestLogout";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { BackHandler, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { NetworkError } from "@/data/remote/http/HttpError";
import { type LinkedReservationsService } from "@/modules/guest-auth/data/services/LinkedReservationsService";
import { type LinkedReservationSummary } from "@/modules/guest-auth/domain/models/LinkedReservationSummary";
import { resolveLinkedReservationOutcome } from "@/modules/guest-auth/domain/resolveLinkedReservationOutcome";
import { useActiveReservationContext } from "@/modules/guest-auth/presentation/ActiveReservationContextProvider";
import { useGuestAuthSession } from "@/modules/guest-auth/presentation/GuestAuthSessionProvider";
import { useLinkedReservations } from "@/modules/guest-auth/presentation/hooks/useLinkedReservations";
import { ConfirmationModal } from "@/shared/components";
import { tokens } from "@/shared/theme/tokens";

export interface LinkedReservationsScreenProps { service?: LinkedReservationsService; }

function dates(reservation: LinkedReservationSummary): string { return reservation.arrival + " — " + reservation.departure; }
function sameStay(reservation: LinkedReservationSummary, context: { reservationId: string; reservationStayId: string } | null): boolean { return Boolean(context && reservation.reservationId === context.reservationId && reservation.reservationStayId === context.reservationStayId); }

/** Owns initial 0/1/N selection and authenticated active-stay changes. */
export function LinkedReservationsScreen(props: LinkedReservationsScreenProps) {
  const {session} = useGuestAuthSession();
  return session ? <LinkedReservationsContent key={session.accountId} {...props} /> : null;
}
function LinkedReservationsContent({ service }: LinkedReservationsScreenProps) {
  const { session } = useGuestAuthSession();
  const { returnTo } = useLocalSearchParams();
  const destination = valetContinuation(returnTo) ?? "/account";
  const { activeReservationContext, setActiveReservationContext } = useActiveReservationContext();
  const query = useLinkedReservations(session?.accountId, service);
  const refetch = query.refetch;
  useFocusEffect(useCallback(() => {
    if (!environment.useMockApi && session?.accountId) void refetch({ cancelRefetch: false });
  }, [refetch, session?.accountId]));
  const [selected, setSelected] = useState<LinkedReservationSummary | null>(null);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StayFilter>('CURRENT');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const customFilters = filter !== 'CURRENT' || !!from || !!to;
  const dateError = !validFilterDate(from) || !validFilterDate(to) || (!!from && !!to && from > to);
  const changingActiveStay = Boolean(activeReservationContext);

  useEffect(() => {
    if (!query.data || activeReservationContext) return;
    const outcome = resolveLinkedReservationOutcome(filterLinkedReservations(query.data));
    if (outcome.kind !== "AUTO_SELECT") return;
    setActiveReservationContext(outcome.context);
    router.replace(destination);
  }, [activeReservationContext, query.data, setActiveReservationContext, destination]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, []);

  function choose(reservation: LinkedReservationSummary): void {
    if (sameStay(reservation, activeReservationContext)) { setSelected(null); return; }
    setSelected(reservation);
  }
  function continueSelection(): void {
    if (!selected) return;
    if (changingActiveStay) { setConfirmationVisible(true); return; }
    setActiveReservationContext({ reservationId: selected.reservationId, reservationStayId: selected.reservationStayId });
    router.replace(destination);
  }
  function confirmChange(): void {
    if (!selected) return;
    setActiveReservationContext({ reservationId: selected.reservationId, reservationStayId: selected.reservationStayId });
    setConfirmationVisible(false);
    router.replace(destination);
  }

  if (!session) return null;
  if (query.isPending) return <State body="Buscamos las estadías vinculadas a tu cuenta." testID="linked-reservations-loading" title="Cargando estadías" />;
  if (query.isError) { const offline = query.error instanceof NetworkError; return <State body={offline ? "Conéctate a internet e inténtalo de nuevo." : "Inténtalo nuevamente."} offline={offline} onRetry={() => query.refetch()} testID={offline ? "linked-reservations-offline" : "linked-reservations-error"} title={offline ? "Sin conexión" : "No pudimos cargar tus estadías"} />; }
  const rows = query.data ?? [];
  const visibleRows = filterLinkedReservations(rows, filter, search, from, to);
  const outcome = resolveLinkedReservationOutcome(filterLinkedReservations(rows));
  if (rows.length === 0) return <State actionLabel="Acceder a una estadía" body="No encontramos estadías vinculadas a esta cuenta." onRetry={() => router.replace("/access")} testID="linked-reservations-empty" title="Sin estadías vinculadas" />;
  if (outcome.kind === "AUTO_SELECT" && !changingActiveStay) return <State body="Estamos preparando tu estadía." testID="linked-reservations-loading" title="Cargando estadías" />;

  return <View style={styles.screen} testID="linked-reservations-screen"><ScrollView contentContainerStyle={styles.content}>
    <Text accessibilityRole="header" style={styles.title}>Seleccionar estadía</Text>
    <View style={styles.searchRow}>
      <TextInput accessibilityLabel="Buscar estadías" placeholder="Hotel o fechas" value={search} onChangeText={setSearch} style={styles.search} testID="linked-reservations-search" />
      <Pressable accessibilityRole="button" accessibilityLabel={customFilters ? 'Filtros de estadías activos' : 'Filtrar estadías'} accessibilityState={{expanded: filtersVisible}} onPress={() => setFiltersVisible(true)} style={styles.filterButton} testID="linked-reservations-filters">
        <SymbolView name={{android: 'filter_alt', ios: 'line.3.horizontal.decrease', web: 'filter_alt'}} size={22} tintColor={tokens.color.brand} accessibilityElementsHidden />
        {customFilters ? <View style={styles.filterDot} testID="linked-reservations-filter-active" /> : null}
      </Pressable>
    </View>
    {visibleRows.length === 0 ? <Text style={styles.body} testID="linked-reservations-no-results">{dateError ? 'Revisa el rango de fechas.' : 'Sin estadías para estos filtros.'}</Text> : null}
    {visibleRows.map((reservation) => { const current = sameStay(reservation, activeReservationContext); const checked = current || selected?.reservationStayId === reservation.reservationStayId; return <Pressable accessibilityRole="radio" accessibilityState={{ checked }} key={reservation.reservationStayId} onPress={() => choose(reservation)} style={[styles.card, checked && styles.cardSelected]} testID={"linked-reservation-" + reservation.reservationStayId}><Text style={styles.reference}>{reservation.reference}</Text><Text style={styles.body}>{reservation.propertyLabel ?? "Hotel Boutique"}</Text><Text style={styles.body}>{dates(reservation)}</Text><Text style={styles.body}>{reservation.roomLabel ? "Habitación " + reservation.roomLabel : "Habitación por asignar"}</Text>{current ? <Text style={styles.current}>Estadía actual</Text> : null}</Pressable>; })}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !selected }} disabled={!selected} onPress={continueSelection} style={[styles.button, !selected && styles.buttonDisabled]} testID="linked-reservations-continue"><Text style={styles.buttonLabel}>{changingActiveStay ? "Cambiar estadía" : "Continuar"}</Text></Pressable>
    {changingActiveStay ? <Pressable accessibilityRole="button" onPress={() => router.replace(destination)} style={styles.cancelButton} testID="linked-reservations-cancel"><Text style={styles.cancelLabel}>Cancelar</Text></Pressable> : null}
  <RealSessionLogout /></ScrollView>
    <Modal transparent visible={filtersVisible} animationType="fade" onRequestClose={() => setFiltersVisible(false)}>
      <View style={styles.modalBackdrop}><View accessibilityViewIsModal style={styles.filterSheet} testID="linked-reservations-filter-modal"><ScrollView contentContainerStyle={styles.filterContent} keyboardShouldPersistTaps="handled">
        <View style={styles.searchRow}><Text accessibilityRole="header" style={styles.reference}>Filtrar estadías</Text><Pressable accessibilityLabel="Cerrar filtros" accessibilityRole="button" onPress={() => setFiltersVisible(false)} style={styles.filterButton}><Text style={styles.reference}>×</Text></Pressable></View>
        {([['CURRENT', 'Todas las vigentes'], ['IN_HOUSE', 'En curso'], ['RESERVED', 'Pendientes'], ['HISTORY', 'Finalizadas / Historial']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{checked: filter === value}} onPress={() => setFilter(value)} style={[styles.filterOption, filter === value && styles.cardSelected]} testID={'linked-filter-' + value}><Text style={styles.body}>{label}</Text></Pressable>)}
        <Text style={styles.body}>Rango de fechas</Text>
        <TextInput accessibilityLabel="Desde" placeholder="Desde · AAAA-MM-DD" maxLength={10} value={from} onChangeText={setFrom} style={styles.search} testID="linked-filter-from" />
        <TextInput accessibilityLabel="Hasta" placeholder="Hasta · AAAA-MM-DD" maxLength={10} value={to} onChangeText={setTo} style={styles.search} testID="linked-filter-to" />
        {dateError ? <Text accessibilityRole="alert" style={styles.body}>Revisa el rango de fechas.</Text> : null}
        <Pressable accessibilityRole="button" onPress={() => {setFilter('CURRENT'); setFrom(''); setTo(''); setSearch('');}} style={styles.cancelButton} testID="linked-filters-clear"><Text style={styles.cancelLabel}>Limpiar filtros</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setFiltersVisible(false)} style={styles.button}><Text style={styles.buttonLabel}>Listo</Text></Pressable>
      </ScrollView></View></View>
    </Modal>
    <ConfirmationModal body="Cambiarás a la estadía seleccionada." confirmLabel="Cambiar estadía" onCancel={() => setConfirmationVisible(false)} onConfirm={confirmChange} testID="linked-reservations-change-confirmation" title="¿Cambiar de estadía?" visible={confirmationVisible} /></View>;
}
function State({ actionLabel = "Reintentar", body, offline, onRetry, testID, title }: { actionLabel?: string; body: string; offline?: boolean; onRetry?: () => void; testID: string; title: string }) { return <View style={styles.screen}><View style={[styles.state, offline && styles.offline]} testID={testID}><Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.body}>{body}</Text>{onRetry ? <Pressable accessibilityRole="button" onPress={onRetry} style={styles.button} testID={testID + "-action"}><Text style={styles.buttonLabel}>{actionLabel}</Text></Pressable> : null}<RealSessionLogout /></View></View>; }
/** Accounts without linked stays must still be able to revoke their native session. */
function RealSessionLogout() {
  const logout = useGuestLogout();
  const [confirm, setConfirm] = useState(false);
  if (environment.useMockApi) return null;
  return <><Pressable accessibilityRole="button" onPress={() => setConfirm(true)} style={styles.cancelButton}><Text style={styles.cancelLabel}>Cerrar sesión</Text></Pressable><ConfirmationModal body="Tendrás que iniciar sesión nuevamente para continuar." confirmLabel="Cerrar sesión" onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); logout(); }} title="¿Cerrar sesión?" visible={confirm} testID="linked-reservations-logout-confirmation" /></>;
}
const styles = StyleSheet.create({ searchRow: {flexDirection: 'row', alignItems: 'center', gap: 8}, search: {flexGrow: 1, flexShrink: 1, minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: tokens.color.border, backgroundColor: tokens.color.surface, paddingHorizontal: 12, color: tokens.color.ink, fontFamily: tokens.typography.family}, filterButton: {minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center'}, filterDot: {position: 'absolute', right: 8, top: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: tokens.color.brand}, modalBackdrop: {flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.35)'}, filterSheet: {backgroundColor: tokens.color.surface, borderRadius: 16, maxHeight: '90%', width: '100%', maxWidth: 440, alignSelf: 'center'}, filterContent: {padding: 20, gap: 8}, filterOption: {padding: 12, borderRadius: 10, borderWidth: 1, borderColor: tokens.color.border}, screen: { backgroundColor: tokens.color.surfaceMuted, flex: 1 }, content: { gap: 12, padding: 24 }, title: { color: tokens.color.inkStrong, fontSize: tokens.typography.size.title, fontWeight: "700" }, subtitle: { color: tokens.color.muted, fontSize: tokens.typography.size.body }, body: { color: tokens.color.ink, fontSize: tokens.typography.size.body }, card: { backgroundColor: tokens.color.surface, borderColor: tokens.color.border, borderRadius: 12, borderWidth: 1, gap: 4, padding: 16 }, cardSelected: { borderColor: tokens.color.brand, borderWidth: 2 }, reference: { color: tokens.color.inkStrong, fontSize: tokens.typography.size.sectionTitle, fontWeight: "700" }, current: { color: tokens.color.brand, fontSize: tokens.typography.size.body, fontWeight: "700" }, button: { alignItems: "center", backgroundColor: tokens.color.brand, borderRadius: 10, marginTop: 8, padding: 14 }, buttonDisabled: { opacity: 0.45 }, buttonLabel: { color: tokens.color.white, fontSize: tokens.typography.size.body, fontWeight: "700" }, cancelButton: { alignItems: "center", borderColor: tokens.color.brand, borderRadius: 10, borderWidth: 1, padding: 14 }, cancelLabel: { color: tokens.color.brand, fontSize: tokens.typography.size.body, fontWeight: "700" }, state: { gap: 12, margin: 24, padding: 24 }, offline: { backgroundColor: tokens.color.pendingSurface } });
