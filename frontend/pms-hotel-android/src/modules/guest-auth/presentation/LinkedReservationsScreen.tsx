import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { NetworkError } from "@/data/remote/http/HttpError";
import { type LinkedReservationsService } from "@/modules/guest-auth/data/services/LinkedReservationsService";
import { type LinkedReservationSummary } from "@/modules/guest-auth/domain/models/LinkedReservationSummary";
import { resolveLinkedReservationOutcome } from "@/modules/guest-auth/domain/resolveLinkedReservationOutcome";
import { useActiveReservationContext } from "@/modules/guest-auth/presentation/ActiveReservationContextProvider";
import { useGuestAuthSession } from "@/modules/guest-auth/presentation/GuestAuthSessionProvider";
import { useGuestLogout } from "@/modules/guest-auth/presentation/hooks/useGuestLogout";
import { useLinkedReservations } from "@/modules/guest-auth/presentation/hooks/useLinkedReservations";
import { ConfirmationModal } from "@/shared/components";
import { tokens } from "@/shared/theme/tokens";

export interface LinkedReservationsScreenProps {
  service?: LinkedReservationsService;
}

function dates(reservation: LinkedReservationSummary): string {
  return reservation.arrival + " — " + reservation.departure;
}

/** Public-shell selection screen; it owns the linked-reservation 0/1/N outcome. */
export function LinkedReservationsScreen({
  service,
}: LinkedReservationsScreenProps) {
  const { session } = useGuestAuthSession();
  const { setActiveReservationContext } = useActiveReservationContext();
  const logout = useGuestLogout();
  const query = useLinkedReservations(session?.accountId, service);
  const [selected, setSelected] = useState<LinkedReservationSummary | null>(
    null,
  );
  const [logoutVisible, setLogoutVisible] = useState(false);

  useEffect(() => {
    if (!query.data) return;
    const outcome = resolveLinkedReservationOutcome(query.data);
    if (outcome.kind !== "AUTO_SELECT") return;
    setActiveReservationContext(outcome.context);
    router.replace("/account");
  }, [query.data, setActiveReservationContext]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setLogoutVisible(true);
        return true;
      },
    );
    return () => subscription.remove();
  }, []);

  function selectReservation(): void {
    if (!selected) return;
    setActiveReservationContext({
      reservationId: selected.reservationId,
      reservationStayId: selected.reservationStayId,
    });
    router.replace("/account");
  }

  if (!session) return null;
  if (query.isPending)
    return (
      <State
        body="Buscamos las estadías vinculadas a tu cuenta."
        testID="linked-reservations-loading"
        title="Cargando estadías"
      />
    );
  if (query.isError) {
    const offline = query.error instanceof NetworkError;
    return (
      <State
        body={
          offline
            ? "Conéctate a internet e inténtalo de nuevo."
            : "Inténtalo nuevamente."
        }
        offline={offline}
        onRetry={() => query.refetch()}
        testID={
          offline ? "linked-reservations-offline" : "linked-reservations-error"
        }
        title={offline ? "Sin conexión" : "No pudimos cargar tus estadías"}
      />
    );
  }

  const outcome = resolveLinkedReservationOutcome(query.data ?? []);
  if (outcome.kind === "EMPTY")
    return (
      <State
        actionLabel="Acceder a una estadía"
        body="No encontramos estadías vinculadas a esta cuenta."
        onRetry={() => router.replace("/access")}
        testID="linked-reservations-empty"
        title="Sin estadías vinculadas"
      />
    );
  if (outcome.kind === "AUTO_SELECT")
    return (
      <State
        body="Estamos preparando tu estadía."
        testID="linked-reservations-loading"
        title="Cargando estadías"
      />
    );

  return (
    <View style={styles.screen} testID="linked-reservations-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Seleccionar estadía
        </Text>
        <Text style={styles.subtitle}>
          Elige la estadía que quieres gestionar.
        </Text>
        {(query.data ?? []).map((reservation) => {
          const active =
            selected?.reservationStayId === reservation.reservationStayId;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              key={reservation.reservationStayId}
              onPress={() => setSelected(reservation)}
              style={[styles.card, active && styles.cardSelected]}
              testID={"linked-reservation-" + reservation.reservationStayId}
            >
              <Text style={styles.reference}>{reservation.reference}</Text>
              <Text style={styles.body}>
                {reservation.propertyLabel ?? "Hotel Boutique"}
              </Text>
              <Text style={styles.body}>{dates(reservation)}</Text>
              <Text style={styles.body}>
                {reservation.roomLabel
                  ? "Habitación " + reservation.roomLabel
                  : "Habitación por asignar"}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !selected }}
          disabled={!selected}
          onPress={selectReservation}
          style={[styles.button, !selected && styles.buttonDisabled]}
          testID="linked-reservations-continue"
        >
          <Text style={styles.buttonLabel}>Continuar</Text>
        </Pressable>
      </ScrollView>
      <ConfirmationModal
        body="Volverás a la pantalla de inicio de sesión."
        confirmLabel="Cerrar sesión"
        destructive
        onCancel={() => setLogoutVisible(false)}
        onConfirm={logout}
        testID="linked-reservations-logout-modal"
        title="¿Cerrar sesión?"
        visible={logoutVisible}
      />
    </View>
  );
}

function State({
  actionLabel = "Reintentar",
  body,
  offline,
  onRetry,
  testID,
  title,
}: {
  actionLabel?: string;
  body: string;
  offline?: boolean;
  onRetry?: () => void;
  testID: string;
  title: string;
}) {
  return (
    <View style={styles.screen}>
      <View style={[styles.state, offline && styles.offline]} testID={testID}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.body}>{body}</Text>
        {onRetry ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.button}
            testID={testID + "-action"}
          >
            <Text style={styles.buttonLabel}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: tokens.color.surfaceMuted, flex: 1 },
  content: { gap: 12, padding: 24 },
  title: {
    color: tokens.color.inkStrong,
    fontSize: tokens.typography.size.title,
    fontWeight: "700",
  },
  subtitle: {
    color: tokens.color.muted,
    fontSize: tokens.typography.size.body,
  },
  body: { color: tokens.color.ink, fontSize: tokens.typography.size.body },
  card: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    padding: 16,
  },
  cardSelected: { borderColor: tokens.color.brand, borderWidth: 2 },
  reference: {
    color: tokens.color.inkStrong,
    fontSize: tokens.typography.size.sectionTitle,
    fontWeight: "700",
  },
  button: {
    alignItems: "center",
    backgroundColor: tokens.color.brand,
    borderRadius: 10,
    marginTop: 8,
    padding: 14,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonLabel: {
    color: tokens.color.white,
    fontSize: tokens.typography.size.body,
    fontWeight: "700",
  },
  state: { gap: 12, margin: 24, padding: 24 },
  offline: { backgroundColor: tokens.color.pendingSurface },
});
