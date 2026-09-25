import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NetworkError } from "@/data/remote/http/HttpError";
import { GuestCheckoutDueState, useCheckoutStatus } from "@/modules/checkout";
import {
  guestFeatureIcons,
  GuestChildHeader,
  GuestNavigationShell,
  useGuestNotice,
  useGuestNavigationMenu,
} from "@/modules/navigation";
import {
  getActiveLateCheckoutRequest, getEffectiveCheckoutAt,
  getFirstAvailableServiceDate,
  getGuestStayActionStatus,
  getInitialServiceDate,
  getMinimumServiceTime,
  getNearestServiceTime,
  getStayServiceDateWindow,
  isServiceDateWithinStay,
  isServiceWithinEffectiveCheckout,
  parseServiceDate,
  useSessionServiceRequests,
} from "@/modules/service-requests";
import { type RoomServiceService } from "@/modules/services/room-service/data/services/RoomServiceService";
import {
  calculateRoomServiceTotal,
  initialRoomServiceCart,
  isRoomServiceCartValid,
  ROOM_SERVICE_MAX_ITEM_QUANTITY,
  roomServiceCartReducer,
  type RoomServiceCartState,
} from "@/modules/services/room-service/domain/models/RoomServiceCart";
import { buildRoomServiceSessionRequestInput } from "@/modules/services/room-service/domain/buildRoomServiceSessionRequestInput";
import {
  roomServiceCategories,
  roomServiceCategoryPeriod,
  type RoomServiceCategory,
  type RoomServiceMenu,
  type RoomServiceMenuItem,
} from "@/modules/services/room-service/domain/models/RoomServiceMenu";
import {
  getRoomServicePeriodWindows, hasIncompatibleRoomServiceCartPeriods,
  isRoomServiceCartAvailableAt, isRoomServicePeriodAvailableOnDate, isRoomServiceTimeInWindow,
} from "@/modules/services/room-service/domain/roomServiceAvailability";
import { useRoomServiceMenu } from "@/modules/services/room-service/presentation/hooks/useRoomServiceMenu";
import { useSubmitRoomService } from "@/modules/services/room-service/presentation/hooks/useSubmitRoomService";
import { roomServiceStyles as styles } from "@/modules/services/room-service/presentation/roomServiceStyles";
import { type StayService } from "@/modules/stay";
import { useCurrentStay } from "@/modules/stay/presentation/hooks/useCurrentStay";
import {
  ConfirmationModal,
  ServiceCartItemRow,
  ServiceCartSheet,
  ServiceCatalogItemCard,
  ServiceDatePicker,
  formatGuestDate,
  TimeWheelPicker,
} from "@/shared/components";
import { useAppClock } from "@/shared/time";
import { tokens } from "@/shared/theme/tokens";
import { deriveRemoteState } from "@/state/remoteState";

export interface RoomServiceScreenProps {
  service?: RoomServiceService;
  stayService?: StayService;
  nowMs?: () => number;
}
type RoomServiceStep = "CATALOG" | "CART" | "SCHEDULE";
const allDayTimes = Array.from(
  { length: 24 * 60 },
  (_, index) =>
    `${String(Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}`,
);

const categoryLabelByPeriod = {
  BREAKFAST: "Desayunos",
  LUNCH: "Almuerzos",
  DINNER: "Cenas",
  BEVERAGES: "Bebidas",
} as const;

function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es");
}

function Button({
  label,
  onPress,
  testID,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  testID: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.buttonDisabled]}
      testID={testID}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}
function StateCard({
  title,
  body,
  testID,
  offline = false,
  success = false,
  onAction,
  actionLabel,
}: {
  title: string;
  body: string;
  testID: string;
  offline?: boolean;
  success?: boolean;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.stateCard,
        offline && styles.offlineStateCard,
        success && styles.successStateCard,
      ]}
      testID={testID}
    >
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {onAction && actionLabel ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          testID={`${testID}-action`}
        />
      ) : null}
    </View>
  );
}
function ProductCard({
  item,
  quantity,
  disabled,
  onDecrement,
  onIncrement,
}: {
  item: RoomServiceMenuItem;
  quantity: number;
  disabled: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <ServiceCatalogItemCard
      disabled={disabled}
      incrementDisabled={quantity >= ROOM_SERVICE_MAX_ITEM_QUANTITY}
      key={item.fixtureKey}
      onDecrement={onDecrement}
      onIncrement={onIncrement}
      price={`Q ${item.priceAmount}`}
      quantity={quantity}
      testID={`room-service-product-${item.fixtureKey}`}
      title={item.name}
    />
  );
}
function CartPanel({
  cart,
  menu,
  notes,
  pending,
  onClose,
  onDecrement,
  onIncrement,
  onNotesChange,
  onNext,
  onRemove,
}: {
  cart: RoomServiceCartState;
  menu: RoomServiceMenu;
  notes: string;
  pending: boolean;
  onClose: () => void;
  onDecrement: (key: string) => void;
  onIncrement: (key: string) => void;
  onNotesChange: (value: string) => void;
  onNext: () => void;
  onRemove: (key: string) => void;
}) {
  const total = calculateRoomServiceTotal(menu, cart);
  return (
    <ServiceCartSheet
      footer={<Button disabled={cart.items.length === 0 || pending} label="Siguiente" onPress={onNext} testID="room-service-next" />}
      closeTestID="room-service-cart-close"
      onClose={onClose}
      testID="room-service-cart-panel"
      title="Tu pedido"
      visible
    >
      {cart.items.length === 0 ? (
        <Text style={styles.emptyCart}>Aún no has agregado productos.</Text>
      ) : (
        cart.items.map((line) => {
          const item = menu.items.find((menuItem) => menuItem.fixtureKey === line.itemFixtureKey);
          return item ? (
            <ServiceCartItemRow
              deleteLabel={'Eliminar ' + item.name}
              key={line.itemFixtureKey}
              onRemove={() => onRemove(item.fixtureKey)}
              rowTestID={'room-service-cart-line-' + item.fixtureKey}
              testID={'room-service-cart-' + item.fixtureKey}
            >
              <ServiceCatalogItemCard
                disabled={pending}
                incrementDisabled={line.quantity >= ROOM_SERVICE_MAX_ITEM_QUANTITY}
                onDecrement={() => onDecrement(item.fixtureKey)}
                onIncrement={() => onIncrement(item.fixtureKey)}
                price={'Q ' + item.priceAmount}
                quantity={line.quantity}
                testID={'room-service-cart-item-' + item.fixtureKey}
                title={item.name}
              />
            </ServiceCartItemRow>
          ) : null;
        })
      )}
      <View style={styles.totalSection}>
        <Text style={styles.deliveryLabel}>Total</Text>
        <Text style={styles.total} testID="room-service-total">{'Q ' + total}</Text>
      </View>
      <Text style={styles.productName}>Notas (opcional)</Text>
      <TextInput
        accessibilityLabel="Notas (opcional)"
        accessibilityState={{ disabled: pending }}
        editable={!pending}
        maxLength={500}
        multiline
        onChangeText={onNotesChange}
        style={styles.notes}
        testID="room-service-notes"
        value={notes}
      />
    </ServiceCartSheet>
  );
}

function SchedulePanel({
  cart,
  deliveryTime,
  deliveryTimeAllowed,
  menu,
  noAvailability,
  noAvailabilityBody,
  periodsIncompatible,
  pending,
  scheduleError,
  serviceDate,
  submitError,
  submitOffline,
  onBack,
  onOpenDatePicker,
  onOpenTimePicker,
  onSubmit,
}: {
  cart: RoomServiceCartState;
  deliveryTime: string | null;
  deliveryTimeAllowed: boolean;
  menu: RoomServiceMenu;
  noAvailability: boolean;
  noAvailabilityBody: string;
  periodsIncompatible: boolean;
  pending: boolean;
  scheduleError: boolean;
  serviceDate: string;
  submitError: boolean;
  submitOffline: boolean;
  onBack: () => void;
  onOpenDatePicker: () => void;
  onOpenTimePicker: () => void;
  onSubmit: () => void;
}) {
  const units = cart.items.reduce((total, item) => total + item.quantity, 0);
  const total = calculateRoomServiceTotal(menu, cart);
  const disabled =
    cart.items.length === 0 ||
    deliveryTime === null ||
    !deliveryTimeAllowed ||
    pending ||
    noAvailability ||
    periodsIncompatible;
  return (
    <Modal animationType="slide" onRequestClose={onBack} transparent visible>
      <View style={styles.modalBackdrop}>
        <SafeAreaView edges={["bottom"]} style={styles.modalSafeArea}>
          <View
            accessibilityViewIsModal
            style={styles.cartSheet}
            testID="room-service-schedule-panel"
          >
            <View style={styles.cartHeader}>
              <Text accessibilityRole="header" style={styles.cartTitle}>
                Programar pedido
              </Text>
              <Pressable
                accessibilityLabel="Volver al carrito"
                accessibilityRole="button"
                onPress={onBack}
                style={styles.closeButton}
                testID="room-service-schedule-back"
              >
                <Text style={styles.closeLabel}>←</Text>
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.cartContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.totalSection}>
                <Text style={styles.deliveryLabel}>Resumen</Text>
                <Text
                  style={styles.total}
                >{`${units} ${units === 1 ? "producto" : "productos"} · Q ${total}`}</Text>
              </View>
              <Text style={styles.productName}>Fecha</Text>
              <Pressable
                accessibilityLabel={`Seleccionar fecha del servicio: ${formatGuestDate(serviceDate)}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: pending }}
                disabled={pending}
                onPress={onOpenDatePicker}
                style={styles.deliveryPicker}
                testID="room-service-date-selector"
              >
                <Text style={styles.deliveryValue}>
                  {formatGuestDate(serviceDate)}
                </Text>
                <Text accessible={false} style={styles.deliveryChevron}>
                  ⌄
                </Text>
              </Pressable>
              <Text style={styles.productName}>Entrega</Text>
              <Pressable
                accessibilityLabel="Seleccionar hora de entrega"
                accessibilityRole="button"
                accessibilityState={{ disabled: pending }}
                disabled={pending}
                onPress={onOpenTimePicker}
                style={styles.deliveryPicker}
                testID="room-service-delivery-picker"
              >
                <Text
                  style={[
                    styles.deliveryValue,
                    deliveryTime === null && styles.deliveryPlaceholder,
                  ]}
                >
                  {deliveryTime ?? "Seleccionar hora"}
                </Text>
                <Text accessible={false} style={styles.deliveryChevron}>
                  ⌄
                </Text>
              </Pressable>
              {periodsIncompatible ? (
                <StateCard
                  body="Este pedido no puede programarse en el horario seleccionado."
                  testID="room-service-periods-incompatible"
                  title="Productos con horarios incompatibles"
                />
              ) : noAvailability ? (
                <StateCard
                  body={noAvailabilityBody}
                  testID="room-service-no-availability"
                  title="Sin disponibilidad"
                />
              ) : scheduleError ||
                (deliveryTime !== null && !deliveryTimeAllowed) ? (
                <StateCard
                  body="Este pedido no puede programarse en el horario seleccionado."
                  testID="room-service-schedule-error"
                  title="Hora no disponible"
                />
              ) : null}
              {submitError || submitOffline ? (
                <StateCard
                  body={
                    submitOffline
                      ? "Conéctate a internet y reintenta tu pedido."
                      : "Intenta nuevamente."
                  }
                  offline={submitOffline}
                  testID={
                    submitOffline
                      ? "room-service-submit-offline"
                      : "room-service-submit-error"
                  }
                  title={
                    submitOffline
                      ? "Sin conexión"
                      : "No pudimos enviar tu pedido"
                  }
                />
              ) : null}
              <Button
                disabled={disabled}
                label={
                  pending
                    ? "Enviando pedido..."
                    : submitError || submitOffline
                      ? "Reintentar"
                      : "Confirmar pedido"
                }
                onPress={onSubmit}
                testID="room-service-submit"
              />
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/** Query owns menu state, Mutation owns submit state, and the cart is local UI configuration. */
export function RoomServiceScreen({
  service,
  stayService,
  nowMs,
}: RoomServiceScreenProps) {
  const appClock = useAppClock();
  const getNowMs = nowMs ?? appClock.nowMs;
  const menuQuery = useRoomServiceMenu(service);
  const menu = deriveRemoteState(menuQuery, () => false);
  const stayQuery = useCurrentStay(stayService);
  const stay = deriveRemoteState(stayQuery, () => false);
  const submission = useSubmitRoomService(service);
  const { addRequest, requests, updateRequest } = useSessionServiceRequests();
  const { isCheckedOut } = useCheckoutStatus();
  const effectiveCheckoutAtMs =
    stay.kind === "success"
      ? getEffectiveCheckoutAt(stay.data, requests)
      : null;
  const checkoutDayContext = useMemo(() => stay.kind === "success"
    ? { departure: stay.data.departure, hasActiveLateCheckout: Boolean(getActiveLateCheckoutRequest(requests)) }
    : undefined,
  [requests, stay]);
  const lifecycle =
    stay.kind === "success"
      ? getGuestStayActionStatus({
          isCheckedOut,
          nowMs: getNowMs(),
          requests,
          stay: stay.data,
        })
      : isCheckedOut
        ? "CHECKED_OUT"
        : "ACTIVE";
  const { showServiceRequestSuccess } = useGuestNotice();
  const { registerNavigationGuard } = useGuestNavigationMenu();
  const { editRequestId, returnTo } = useLocalSearchParams<{
    editRequestId?: string;
    returnTo?: string;
  }>();
  const [category, setCategory] = useState<RoomServiceCategory>("Desayunos");
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [periodNotice, setPeriodNotice] = useState(false);
  const [cart, dispatch] = useReducer(
    roomServiceCartReducer,
    initialRoomServiceCart,
  );
  const cartAvailabilityTimes = useMemo(
    () =>
      menu.kind === "success"
        ? allDayTimes.filter((time) =>
            isRoomServiceCartAvailableAt(menu.data, cart, "2000-01-01", time, checkoutDayContext),
          )
        : allDayTimes,
    [cart, checkoutDayContext, menu],
  );
  const [notes, setNotes] = useState("");
  const [serviceDate, setServiceDate] = useState(() =>
    getInitialServiceDate(getNowMs(), allDayTimes),
  );
  const [deliveryTime, setDeliveryTime] = useState<string | null>(() =>
    getNearestServiceTime(
      getInitialServiceDate(getNowMs(), allDayTimes),
      allDayTimes,
      getNowMs(),
    ),
  );
  const [step, setStep] = useState<RoomServiceStep>("CATALOG");
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
  const [discardVisible, setDiscardVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [scheduleError, setScheduleError] = useState(false);
  const [, setTimeCheckVersion] = useState(0);
  const inFlight = useRef(false);
  const editLoaded = useRef<string | null>(null);
  const [initialEditDraft, setInitialEditDraft] = useState<string | null>(null);
  const pendingExit = useRef<(() => void) | null>(null);
  const editedRequest =
    typeof editRequestId === "string"
      ? requests.find(
          (request) =>
            request.sessionRequestId === editRequestId &&
            request.details?.type === "ROOM_SERVICE",
        )
      : undefined;
  const returnFromEdit = () =>
    router.dismissTo(
      returnTo === "account"
        ? "/account"
        : returnTo === "requests"
          ? "/services/requests"
          : "/services",
    );
  useEffect(() => {
    const details = editedRequest?.details;
    if (
      !editedRequest ||
      editLoaded.current === editedRequest.sessionRequestId ||
      !details ||
      details.type !== "ROOM_SERVICE"
    )
      return;
    editLoaded.current = editedRequest.sessionRequestId;
    const timer = setTimeout(() => {
      dispatch({ type: "SET_ITEMS", items: details.items });
      if (details.serviceDate) setServiceDate(details.serviceDate);
      setDeliveryTime(details.deliveryTime);
      setNotes(details.notes ?? "");
      setInitialEditDraft(
        JSON.stringify({
          items: details.items,
          notes: details.notes ?? "",
          serviceDate: details.serviceDate,
          deliveryTime: details.deliveryTime,
        }),
      );
      setStep("CART");
    }, 0);
    return () => clearTimeout(timer);
  }, [editedRequest]);
  useEffect(() => {
    if (stay.kind !== "success") return;
    const firstAvailable = getFirstAvailableServiceDate(
      getNowMs(),
      cartAvailabilityTimes,
      stay.data.arrival,
      stay.data.departure,
      effectiveCheckoutAtMs,
    );
    const nearest = isServiceDateWithinStay(
      serviceDate,
      getNowMs(),
      stay.data.arrival,
      stay.data.departure,
    )
      ? getNearestServiceTime(
          serviceDate,
          cartAvailabilityTimes,
          getNowMs(),
          deliveryTime,
          stay.data.arrival,
          stay.data.departure,
          effectiveCheckoutAtMs,
    )
      : null;
    if (nearest === deliveryTime) return;
    const timer = setTimeout(() => {
      if (nearest) {
        setDeliveryTime(nearest);
      } else if (firstAvailable) {
        setServiceDate(firstAvailable);
        setDeliveryTime(
          getNearestServiceTime(
            firstAvailable,
            cartAvailabilityTimes,
            getNowMs(),
            undefined,
            stay.data.arrival,
            stay.data.departure,
            effectiveCheckoutAtMs,
          ),
        );
      } else if (
        !isServiceDateWithinStay(
          serviceDate,
          getNowMs(),
          stay.data.arrival,
          stay.data.departure,
        )
      ) setServiceDate(stay.data.departure);
    }, 0);
    return () => clearTimeout(timer);
  }, [cartAvailabilityTimes, deliveryTime, effectiveCheckoutAtMs, getNowMs, serviceDate, stay]);
  useEffect(() => {
    if (isCheckedOut) return;
    const interval = setInterval(
      () => setTimeCheckVersion((current) => current + 1),
      30_000,
    );
    return () => clearInterval(interval);
  }, [isCheckedOut]);
  const submitOffline =
    submission.isError && submission.error instanceof NetworkError;
  const submitError = submission.isError && !submitOffline;
  const pending = submission.isPending;
  const periodsIncompatible =
    menu.kind === "success" &&
    hasIncompatibleRoomServiceCartPeriods(menu.data, cart);
  const cartMealPeriod = cart.items.reduce<"BREAKFAST" | "LUNCH" | "DINNER" | null>((period, line) => {
    if (period || !line.mealPeriod || line.mealPeriod === "BEVERAGES") return period;
    return line.mealPeriod;
  }, null);
  const categoryIncompatibleWithCart =
    cartMealPeriod !== null &&
    roomServiceCategoryPeriod[category] !== "BEVERAGES" &&
    roomServiceCategoryPeriod[category] !== cartMealPeriod;
  const selectedCategoryPeriod = roomServiceCategoryPeriod[category];
  const selectedCategoryAvailable = stay.kind !== "success" || serviceDate !== stay.data.departure || allDayTimes.some((time) =>
    isRoomServicePeriodAvailableOnDate(selectedCategoryPeriod, serviceDate, time, checkoutDayContext) &&
    getRoomServicePeriodWindows(selectedCategoryPeriod).some((window) => isRoomServiceTimeInWindow(time, window)) &&
    isServiceWithinEffectiveCheckout({
      arrival: stay.data.arrival,
      effectiveCheckoutAtMs,
      nowMs: getNowMs(),
      serviceDate,
      startTime: time,
    }),
  );

  function selectCategory(nextCategory: RoomServiceCategory) {
    const nextPeriod = roomServiceCategoryPeriod[nextCategory];
    setPeriodNotice(Boolean(cartMealPeriod && nextPeriod !== "BEVERAGES" && nextPeriod !== cartMealPeriod));
    if (stay.kind === "success") {
      const candidateTimes = allDayTimes.filter((time) =>
        isRoomServicePeriodAvailableOnDate(nextPeriod, serviceDate, time, checkoutDayContext) &&
        getRoomServicePeriodWindows(nextPeriod).some((window) => isRoomServiceTimeInWindow(time, window)),
      );
      setDeliveryTime((current) => getNearestServiceTime(
        serviceDate, candidateTimes, getNowMs(), current ?? undefined, stay.data.arrival, stay.data.departure, effectiveCheckoutAtMs,
      ));
    }
    setCategory(nextCategory);
    setSearch("");
    setCategoryModalVisible(false);
  }
  const serviceDateWithinStay =
    stay.kind === "success" &&
    isServiceDateWithinStay(
      serviceDate,
      getNowMs(),
      stay.data.arrival,
      stay.data.departure,
    );
  const stayDateWindow =
    stay.kind === "success"
      ? getStayServiceDateWindow(
          stay.data.arrival,
          stay.data.departure,
          getNowMs(),
        )
      : null;
  const noAvailability =
    stay.kind === "success" &&
    menu.kind === "success" &&
    getFirstAvailableServiceDate(
      getNowMs(),
      cartAvailabilityTimes,
      stay.data.arrival,
      stay.data.departure,
      effectiveCheckoutAtMs,
    ) === null;
  const noAvailabilityBody =
    effectiveCheckoutAtMs !== null && getMinimumServiceTime(getNowMs()) > effectiveCheckoutAtMs
      ? "No hay horarios disponibles que cumplan con los 30 minutos de anticipación antes de tu hora de salida."
      : "No hay horarios disponibles durante tu estadía.";
  const deliveryTimeAllowed =
    stay.kind === "success" &&
    menu.kind === "success" &&
    deliveryTime !== null &&
    isRoomServiceCartAvailableAt(menu.data, cart, serviceDate, deliveryTime, checkoutDayContext) &&
    isServiceWithinEffectiveCheckout({
      arrival: stay.data.arrival,
      effectiveCheckoutAtMs,
      nowMs: getNowMs(),
      serviceDate,
      startTime: deliveryTime,
    });
  const isDirty =
    cart.items.length > 0 &&
    (!editedRequest ||
      initialEditDraft !== JSON.stringify({ items: cart.items, notes, serviceDate, deliveryTime }));
  useEffect(() => registerNavigationGuard({
    isDirty,
    message: editedRequest
      ? "Los cambios que no hayas guardado se perderán."
      : "Los productos del carrito se eliminarán si sales de esta pantalla.",
    onDiscard: () => { if (!editedRequest) resetCreate(); },
    title: editedRequest ? "¿Descartar cambios?" : "¿Salir del servicio?",
  }), [editedRequest, isDirty, registerNavigationGuard]);
  if (isCheckedOut)
    return (
      <View style={styles.screen} testID="room-service-stay-completed">
        <GuestChildHeader
          backAccessibilityLabel="Volver a servicios"
          backTestID="room-service-back-arrow"
          onBack={() => router.dismissTo("/services")}
          title="Room Service"
        />
        <View style={styles.content}>
          <StateCard
            body="Los servicios de estancia ya no están disponibles."
            testID="room-service-creation-blocked"
            title="Estancia finalizada"
          />
        </View>
        <GuestNavigationShell />
      </View>
    );
  if (lifecycle === "CHECKOUT_DUE")
    return (
      <View style={styles.screen} testID="room-service-screen">
        <GuestChildHeader
          backAccessibilityLabel="Volver a servicios"
          backTestID="room-service-back-arrow"
          onBack={() => router.dismissTo("/services")}
          title="Room Service"
        />
        <View style={styles.content}>
          <GuestCheckoutDueState
            actionTestID="room-service-checkout-due-action"
            testID="room-service-checkout-due"
          />
        </View>
        <GuestNavigationShell />
      </View>
    );
  function selectServiceDate(nextDate: string) {
    setDatePickerVisible(false);
    setServiceDate(nextDate);
    setDeliveryTime(
      stay.kind === "success"
        ? getNearestServiceTime(
            nextDate,
            cartAvailabilityTimes,
            getNowMs(),
            deliveryTime,
            stay.data.arrival,
            stay.data.departure,
            effectiveCheckoutAtMs,
          )
        : null,
    );
  }
  function resetCreate() {
    dispatch({ type: "SET_ITEMS", items: [] });
    setNotes("");
    setScheduleError(false);
    setStep("CATALOG");
  }
  function requestExit(action: () => void) {
    if (!isDirty) {
      action();
      return;
    }
    pendingExit.current = action;
    setDiscardVisible(true);
  }
  function discardAndExit() {
    setDiscardVisible(false);
    if (!editedRequest) resetCreate();
    const action = pendingExit.current;
    pendingExit.current = null;
    action?.();
  }
  function submit() {
    if (
      lifecycle !== "ACTIVE" ||
      menu.kind !== "success" ||
      stay.kind !== "success" ||
      cart.items.length === 0 ||
      !isRoomServiceCartValid(cart) ||
      deliveryTime === null ||
      pending ||
      submission.isSuccess ||
      inFlight.current
    )
      return;
    if (
      !serviceDateWithinStay ||
      !isRoomServiceCartAvailableAt(
        menu.data,
        cart,
        serviceDate,
        deliveryTime, checkoutDayContext,
      ) ||
      !isServiceWithinEffectiveCheckout({
        arrival: stay.data.arrival,
        effectiveCheckoutAtMs,
        nowMs: getNowMs(),
        serviceDate,
        startTime: deliveryTime,
      })
    ) {
      setScheduleError(true);
      return;
    }
    setScheduleError(false);
    const trimmedNotes = notes.trim();
    inFlight.current = true;
    submission.mutate(
      {
        items: cart.items,
        deliveryTime,
        serviceDate,
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
      },
      {
        onSettled: () => {
          inFlight.current = false;
        },
        onSuccess: () => {
          const totalUnits = cart.items.reduce(
            (total, item) => total + item.quantity,
            0,
          );
          const input = buildRoomServiceSessionRequestInput({
            cart,
            deliveryTime,
            menu: menu.data,
            serviceDate,
            summary: `${formatGuestDate(serviceDate)} · ${deliveryTime} · ${totalUnits} ${totalUnits === 1 ? "producto" : "productos"}`,
          });
          if (editedRequest)
            updateRequest(editedRequest.sessionRequestId, input);
          else {
            addRequest(input);
            resetCreate();
          }
          showServiceRequestSuccess(editedRequest ? "UPDATED" : "CREATED");
          router.replace("/account");
        },
      },
    );
  }
  const canOpenCart =
    menu.kind === "success" && stay.kind === "success" && !pending;
  const cartItemCount = cart.items.reduce((total, item) => total + item.quantity, 0);
  const goBack = () => {
    if (step === "SCHEDULE") setStep("CART");
    else if (step === "CART") setStep("CATALOG");
    else
      requestExit(
        editedRequest ? returnFromEdit : () => router.dismissTo("/services"),
      );
  };
  return (
    <View style={styles.screen} testID="room-service-screen">
      <GuestChildHeader backAccessibilityLabel="Volver a servicios" backTestID="room-service-back-arrow" onBack={goBack} title="Room Service" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.scroll}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          style={styles.scroll}
        >
          {submission.isSuccess ? (
            <View testID="room-service-submit-success" />
          ) : stay.kind === "loading" ? (
            <StateCard
              body="Espera un momento."
              testID="room-service-stay-loading"
              title="Cargando mi estadía"
            />
          ) : stay.kind === "offline" || stay.kind === "error" ? (
            <StateCard
              actionLabel="Reintentar"
              body={
                stay.kind === "offline"
                  ? "Conéctate y reintenta para recuperar tu estadía."
                  : "Reintenta para recuperar los datos de tu estadía."
              }
              offline={stay.kind === "offline"}
              onAction={() => void stayQuery.refetch()}
              testID={`room-service-stay-${stay.kind}`}
              title={
                stay.kind === "offline"
                  ? "Mi estadía sin conexión"
                  : "No pudimos cargar tu estadía"
              }
            />
          ) : stay.kind === "empty" ? null : menu.kind === "loading" ? (
            <>
              <Text style={styles.room}>
                {stay.data.room
                  ? `Habitación ${stay.data.room.number}`
                  : "Habitación por asignar"}
              </Text>
              <View testID="room-service-menu-loading">
                <Text style={styles.sectionTitle}>Cargando Room Service</Text>
                <View style={styles.skeleton} />
                <View style={styles.skeleton} />
              </View>
            </>
          ) : menu.kind === "offline" || menu.kind === "error" ? (
            <StateCard
              actionLabel="Reintentar"
              body={
                menu.kind === "offline"
                  ? "Conéctate a internet para ver Room Service."
                  : "Intenta nuevamente."
              }
              offline={menu.kind === "offline"}
              onAction={() => void menuQuery.refetch()}
              testID={`room-service-menu-${menu.kind}`}
              title={
                menu.kind === "offline"
                  ? "Sin conexión"
                  : "No pudimos cargar Room Service"
              }
            />
          ) : menu.kind === "success" ? (
            <>
              <View style={styles.contextRow}><Text style={styles.room} testID="room-service-room">
                {stay.data.room
                  ? `Habitación ${stay.data.room.number}`
                  : "Habitación por asignar"}
              </Text>{step === "CATALOG" ? <Pressable accessibilityLabel={cartItemCount > 0 ? `Carrito, ${cartItemCount} artículos` : "Carrito"} accessibilityRole="button" accessibilityState={{ disabled: !canOpenCart }} disabled={!canOpenCart} onPress={() => setStep("CART")} style={[styles.cartAction, !canOpenCart && styles.headerButtonDisabled]} testID="room-service-cart-button"><View accessible={false} testID="room-service-cart-icon"><SymbolView accessibilityElementsHidden name={guestFeatureIcons.cart} size={18} tintColor={tokens.color.brand} /></View><Text style={styles.cartActionLabel}>Carrito{cartItemCount > 0 ? <> <Text testID="room-service-cart-badge">{cartItemCount}</Text></> : null}</Text></Pressable> : null}</View>
              <View style={styles.catalogControls}>
                <TextInput accessibilityLabel={`Buscar dentro de ${category}`} editable={!pending} multiline={false} numberOfLines={1} onChangeText={setSearch} placeholder="Buscar productos..." style={styles.catalogSearch} testID="room-service-search" value={search} />
                <Pressable accessibilityLabel="Seleccionar categoría" accessibilityRole="button" accessibilityState={{ disabled: pending }} disabled={pending} onPress={() => setCategoryModalVisible(true)} style={styles.categorySelector} testID="room-service-category-selector">
                  <Text numberOfLines={1} style={styles.deliveryValue} testID="room-service-category-value">{category}</Text><SymbolView accessibilityElementsHidden name={guestFeatureIcons.chevronDown} size={18} tintColor={tokens.color.muted} />
                </Pressable>
              </View>
              {periodNotice && categoryIncompatibleWithCart ? <View accessibilityLiveRegion="polite" style={styles.stateCard} testID="room-service-period-lock-notice"><Text style={styles.stateBody}>{`Tu pedido ya contiene productos de ${categoryLabelByPeriod[cartMealPeriod!]}. Para agregar productos de ${category}, elimina primero esos productos del carrito.`}</Text><Button label="Cerrar" onPress={() => { setPeriodNotice(false); setCategory(categoryLabelByPeriod[cartMealPeriod!] as RoomServiceCategory); }} testID="room-service-period-lock-close" /></View> : null}
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Catálogo
              </Text>
              <View style={styles.catalog}>
                {menu.data.items
                  .filter((item) => item.periods?.includes(roomServiceCategoryPeriod[category]) ?? item.category === category)
                  .filter((item) => !normalizeSearch(search) || normalizeSearch(item.name).includes(normalizeSearch(search)))
                  .map((item) => {
                    const quantity =
                      cart.items.find(
                        (line) => line.itemFixtureKey === item.fixtureKey,
                      )?.quantity ?? 0;
                    return (
                      <ProductCard
                        disabled={pending || categoryIncompatibleWithCart || !selectedCategoryAvailable}
                        item={item}
                        key={item.fixtureKey}
                        onDecrement={() =>
                          dispatch({
                            type: "DECREMENT_ITEM",
                            itemFixtureKey: item.fixtureKey,
                          })
                        }
                        onIncrement={() => {
                          if (categoryIncompatibleWithCart || !selectedCategoryAvailable) return;
                          dispatch(
                            quantity === 0
                              ? {
                                  type: "ADD_ITEM",
                                  itemFixtureKey: item.fixtureKey,
                                  mealPeriod: roomServiceCategoryPeriod[category],
                                }
                              : {
                                  type: "INCREMENT_ITEM",
                                  itemFixtureKey: item.fixtureKey,
                                },
                          );
                        }}
                        quantity={quantity}
                      />
                    );
                  })}
              </View>
              {!selectedCategoryAvailable ? <Text accessibilityLiveRegion="polite" style={styles.emptyCart} testID="room-service-category-unavailable">No disponible para el horario de tu estancia.</Text> : null}{menu.data.items.filter((item) => (item.periods?.includes(roomServiceCategoryPeriod[category]) ?? item.category === category)).filter((item) => !normalizeSearch(search) || normalizeSearch(item.name).includes(normalizeSearch(search))).length === 0 ? <Text style={styles.emptyCart}>No encontramos productos en esta categoría.</Text> : null}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal animationType="slide" onRequestClose={() => setCategoryModalVisible(false)} transparent visible={categoryModalVisible}>
        <Pressable onPress={() => setCategoryModalVisible(false)} style={styles.modalBackdrop} testID="room-service-category-backdrop">
          <SafeAreaView edges={["bottom"]} pointerEvents="box-none" style={styles.modalSafeArea}>
            <Pressable accessibilityViewIsModal onPress={(event) => event.stopPropagation()} style={styles.cartSheet} testID="room-service-category-modal">
              <Text accessibilityRole="header" style={styles.cartTitle}>Categoría</Text>
              <View style={styles.categoryOptions}>
                {roomServiceCategories.map((item) => {
                  const period = roomServiceCategoryPeriod[item];
                  return <Pressable accessibilityRole="radio" accessibilityState={{ selected: category === item }} key={item} onPress={() => selectCategory(item)} style={[styles.categoryButton, category === item && styles.categoryButtonSelected]} testID={`room-service-category-option-${period}`}><Text style={styles.categoryLabel}>{item}</Text></Pressable>;
                })}
              </View>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>
      {step === "CART" && menu.kind === "success" ? (
        <CartPanel
          cart={cart}
          menu={menu.data}
          notes={notes}
          pending={pending}
          onClose={() => setStep("CATALOG")}
          onDecrement={(key) =>
            dispatch({ type: "DECREMENT_ITEM", itemFixtureKey: key })
          }
          onIncrement={(key) =>
            dispatch({ type: "INCREMENT_ITEM", itemFixtureKey: key })
          }
          onNext={() => setStep("SCHEDULE")}
          onNotesChange={setNotes}
          onRemove={(key) => setPendingRemoval(key)}
        />
      ) : null}
      {step === "SCHEDULE" && menu.kind === "success" ? (
        <SchedulePanel
          cart={cart}
          deliveryTime={deliveryTime}
          deliveryTimeAllowed={deliveryTimeAllowed}
          menu={menu.data}
          noAvailability={noAvailability}
          noAvailabilityBody={noAvailabilityBody}
          periodsIncompatible={periodsIncompatible}
          pending={pending}
          scheduleError={scheduleError}
          serviceDate={serviceDate}
          submitError={submitError}
          submitOffline={submitOffline}
          onBack={() => setStep("CART")}
          onOpenDatePicker={() => setDatePickerVisible(true)}
          onOpenTimePicker={() => {
            setScheduleError(false);
            setTimePickerVisible(true);
          }}
          onSubmit={submit}
        />
      ) : null}
      <ConfirmationModal
        body={`¿Quieres quitar ${menu.kind === "success" ? (menu.data.items.find((item) => item.fixtureKey === pendingRemoval)?.name ?? "") : ""} del carrito?`}
        confirmLabel="Eliminar"
        destructive
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => {
          if (pendingRemoval)
            dispatch({ type: "REMOVE_ITEM", itemFixtureKey: pendingRemoval });
          setPendingRemoval(null);
        }}
        testID="room-service-cart-remove-modal"
        title="Eliminar del carrito"
        visible={pendingRemoval !== null}
      />
      <ServiceDatePicker
        maximumDate={
          stayDateWindow
            ? (parseServiceDate(stayDateWindow.maximumDate) ?? undefined)
            : undefined
        }
        minimumDate={
          stayDateWindow
            ? (parseServiceDate(stayDateWindow.minimumDate) ??
              new Date(getNowMs()))
            : new Date(getNowMs())
        }
        onCancel={() => setDatePickerVisible(false)}
        onConfirm={selectServiceDate}
        testID="room-service-date-picker"
        value={serviceDate}
        visible={datePickerVisible && stayDateWindow !== null}
      />
      <TimeWheelPicker
        availabilityHint={noAvailability ? { accessibilityLabel: 'No hay horarios disponibles para esta solicitud.', label: 'No disponible' } : effectiveCheckoutAtMs !== null ? { accessibilityLabel: 'Los horarios respetan el límite efectivo de check-out.', label: 'Hasta salida' } : { accessibilityLabel: 'La entrega requiere al menos 30 minutos de anticipación.', label: '30 min mín.' }}
        isValueDisabled={(value) =>
          stay.kind !== "success" ||
          menu.kind !== "success" ||
          !isRoomServiceCartAvailableAt(menu.data, cart, serviceDate, value, checkoutDayContext) ||
          !isServiceWithinEffectiveCheckout({
            arrival: stay.data.arrival,
            effectiveCheckoutAtMs,
            nowMs: getNowMs(),
            serviceDate,
            startTime: value,
          })
        }
        mode="time"
        onCancel={() => setTimePickerVisible(false)}
        onConfirm={(value) => {
          if (
            stay.kind === "success" &&
            menu.kind === "success" &&
            isRoomServiceCartAvailableAt(menu.data, cart, serviceDate, value, checkoutDayContext) &&
            isServiceWithinEffectiveCheckout({
              arrival: stay.data.arrival,
              effectiveCheckoutAtMs,
              nowMs: getNowMs(),
              serviceDate,
              startTime: value,
            })
          ) {
            setScheduleError(false);
            setDeliveryTime(value);
          }
          setTimePickerVisible(false);
        }}
        testID="room-service-delivery-time-picker"
        title="Elegir hora de entrega"
        value={deliveryTime as string}
        visible={timePickerVisible && deliveryTime !== null}
      />
      <ConfirmationModal
        body={
          editedRequest
            ? "Los cambios que no hayas guardado se perderán."
            : "Los productos del carrito se eliminarán si sales de esta pantalla."
        }
        confirmLabel="Salir"
        onCancel={() => setDiscardVisible(false)}
        onConfirm={discardAndExit}
        testID="room-service-discard-modal"
        title={editedRequest ? "¿Descartar cambios?" : "¿Salir del servicio?"}
        visible={discardVisible}
      />
      <GuestNavigationShell
        onNavigateAway={(basePath) =>
          requestExit(() => router.replace(basePath))
        }
      />
    </View>
  );
}
