import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { router, Slot, usePathname } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { useLayoutEffect, useRef } from "react";
import { Text } from "react-native";

import RoomServiceRoute from "../app/(guest)/services/room-service";
import ServicesRoute from "../app/(guest)/services";
import { NetworkError } from "@/data/remote/http/HttpError";
import {
  MockRoomServiceService,
  RoomServiceScreen,
  roomServiceMenuFixture,
  type RoomServiceRequest,
  type RoomServiceService,
} from "@/modules/services/room-service";
import { MockStayService, type StayService } from "@/modules/stay";
import { currentStayFixture } from "@/modules/stay/data/mocks/currentStayFixture";
import {
  SessionServiceRequestsProvider,
  useSessionServiceRequests,
} from "@/modules/service-requests";
import {
  CheckoutSessionProvider,
  useCheckoutSession,
} from "@/modules/checkout";
import { GuestNavigationMenuProvider } from "@/modules/navigation";
import {
  ActiveReservationContextProvider,
  GuestAuthSessionProvider,
} from "@/modules/guest-auth";
import { AppClockProvider } from "@/shared/time";

function RequestProbe() {
  const { requests } = useSessionServiceRequests();
  return (
    <Text testID="session-service-requests-probe">
      {JSON.stringify(requests)}
    </Text>
  );
}

function LateCheckoutSeed({ checkoutUntil }: { checkoutUntil: string }) {
  const { addRequest } = useSessionServiceRequests();
  const seeded = useRef(false);
  useLayoutEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    addRequest({
      kind: "LATE_CHECKOUT",
      origin: "SERVICES",
      status: "REQUESTED",
      title: "Late check-out",
      details: {
        type: "LATE_CHECKOUT",
        serviceDate: "2026-09-18",
        checkoutUntil,
      },
    });
  }, [addRequest, checkoutUntil]);
  return null;
}

function CheckedOutSeed() {
  const { createSnapshot } = useCheckoutSession();
  const seeded = useRef(false);
  useLayoutEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    createSnapshot(
      {
        checks: [],
        departureNoteText: "",
        expectedDepartureText: "",
        roomDisplayText: "Habitación 204",
        stayDatesText: "",
      },
      {
        checkoutTotal: {
          amountMinor: 0,
          currency: "GTQ",
          text: "Total · Q0.00",
        },
        items: [],
        paidGuaranteeText: "",
        pendingBalanceText: "",
        totalStayText: "Sin cargos registrados en esta sesión",
        totalText: "Total · Q0.00",
      },
    );
  }, [createSnapshot]);
  return null;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function client() {
  return new QueryClient({
    defaultOptions: {
      queries: { gcTime: 0, retry: false },
      mutations: { gcTime: 0, retry: false },
    },
  });
}

const afternoonNowMs = new Date(2026, 8, 11, 13, 0, 0).getTime();

async function setup(
  service: RoomServiceService = new MockRoomServiceService(),
  stayService: StayService = new MockStayService(),
  nowMs: () => number = () => afternoonNowMs,
  lateCheckoutUntil?: string,
  checkedOut = false,
  context = activeReservationContext,
) {
  const content = (
    <>
      {lateCheckoutUntil ? (
        <LateCheckoutSeed checkoutUntil={lateCheckoutUntil} />
      ) : null}
      <RequestProbe />
      <RoomServiceScreen
        nowMs={nowMs}
        service={service}
        stayService={stayService}
      />
    </>
  );
  const guestContent = checkedOut ? (
    <CheckoutSessionProvider>
      <CheckedOutSeed />
      {content}
    </CheckoutSessionProvider>
  ) : (
    content
  );
  const ui = await render(
    <QueryClientProvider client={client()}>
      <ActiveReservationContextProvider
        initialActiveReservationContext={context}
      >
        <SessionServiceRequestsProvider nowMs={nowMs}>
          {guestContent}
        </SessionServiceRequestsProvider>
      </ActiveReservationContextProvider>
    </QueryClientProvider>,
  );
  return { ui };
}

async function ready(ui: Awaited<ReturnType<typeof render>>) {
  await waitFor(() =>
    expect(
      ui.getByTestId("room-service-product-continental-breakfast"),
    ).toBeTruthy(),
  );
}

async function openCart(ui: Awaited<ReturnType<typeof render>>) {
  await fireEvent.press(ui.getByTestId("room-service-cart-button"));
  await waitFor(() =>
    expect(ui.getByTestId("room-service-cart-panel")).toBeTruthy(),
  );
}

async function selectCategory(
  ui: Awaited<ReturnType<typeof render>>,
  period: "BREAKFAST" | "LUNCH" | "DINNER" | "BEVERAGES",
) {
  await fireEvent.press(ui.getByTestId("room-service-category-selector"));
  await waitFor(() =>
    expect(ui.getByTestId("room-service-category-modal")).toBeTruthy(),
  );
  await fireEvent.press(
    ui.getByTestId(`room-service-category-option-${period}`),
  );
}

async function chooseDeliveryTime(
  ui: Awaited<ReturnType<typeof render>>,
  hour = "13",
  minute = "45",
) {
  if (!ui.queryByTestId("room-service-schedule-panel")) {
    await fireEvent.press(ui.getByTestId("room-service-next"));
    await waitFor(() =>
      expect(ui.getByTestId("room-service-schedule-panel")).toBeTruthy(),
    );
  }
  await fireEvent.press(ui.getByTestId("room-service-delivery-picker"));
  await waitFor(() =>
    expect(
      ui.getByTestId("room-service-delivery-time-picker-wheel"),
    ).toBeTruthy(),
  );
  await fireEvent.press(
    ui.getByTestId(`room-service-delivery-time-picker-hour-${hour}`),
  );
  await fireEvent.press(
    ui.getByTestId(`room-service-delivery-time-picker-minute-${minute}`),
  );
  await fireEvent.press(
    ui.getByTestId("room-service-delivery-time-picker-confirm"),
  );
}

function PathProbe() {
  return <Text testID="pathname">{usePathname()}</Text>;
}

const activeReservationContext = {
  reservationId: "HB-2026-004281",
  reservationStayId: "stay-2026-004281",
};

describe("Room Service — IMP-AND-0111", () => {
  it("replaces every mutable Room Service control with checkout due at effective checkout", async () => {
    const submitRequest = jest.fn<Promise<void>, [RoomServiceRequest]>(
      async () => undefined,
    );
    const push = jest
      .spyOn(router, "push")
      .mockImplementation(() => undefined as never);
    const { ui } = await setup(
      new MockRoomServiceService({ submitRequest }),
      new MockStayService(),
      () => new Date(2026, 8, 18, 12, 0).getTime(),
    );
    await waitFor(() =>
      expect(ui.getByTestId("room-service-checkout-due")).toBeTruthy(),
    );
    expect(ui.getByTestId("room-service-checkout-due-action")).toBeTruthy();
    expect(ui.queryByTestId("room-service-category-selector")).toBeNull();
    expect(ui.queryByTestId("room-service-search")).toBeNull();
    expect(ui.queryByTestId("room-service-cart-button")).toBeNull();
    expect(ui.queryByTestId("room-service-cart-panel")).toBeNull();
    expect(ui.queryByTestId("room-service-schedule-panel")).toBeNull();
    expect(ui.queryByTestId("room-service-submit")).toBeNull();
    expect(submitRequest).not.toHaveBeenCalled();
    await fireEvent.press(ui.getByTestId("room-service-checkout-due-action"));
    expect(push).toHaveBeenCalledWith("/account/checkout");
    push.mockRestore();
  });

  it.each([
    ["12:00", new Date(2026, 8, 18, 12, 0).getTime(), "ACTIVE"],
    ["13:59", new Date(2026, 8, 18, 13, 59).getTime(), "ACTIVE"],
    ["14:00", new Date(2026, 8, 18, 14, 0).getTime(), "CHECKOUT_DUE"],
  ] as const)(
    "uses the typed Late checkout request at %s",
    async (_, nowMs, lifecycle) => {
      const { ui } = await setup(
        undefined,
        new MockStayService(),
        () => nowMs,
        "14:00",
      );
      if (lifecycle === "ACTIVE") {
        await ready(ui);
        expect(ui.queryByTestId("room-service-checkout-due")).toBeNull();
      } else {
        await waitFor(() =>
          expect(ui.getByTestId("room-service-checkout-due")).toBeTruthy(),
        );
        expect(ui.queryByTestId("room-service-category-selector")).toBeNull();
      }
      ui.unmount();
    },
  );

  it("keeps checked-out Room Service separate from checkout due", async () => {
    const { ui } = await setup(
      undefined,
      new MockStayService(),
      () => new Date(2026, 8, 18, 12, 0).getTime(),
      undefined,
      true,
    );
    await waitFor(() =>
      expect(ui.getByTestId("room-service-stay-completed")).toBeTruthy(),
    );
    expect(ui.getByTestId("room-service-creation-blocked")).toBeTruthy();
    expect(ui.queryByTestId("room-service-checkout-due")).toBeNull();
  });

  it("keeps the cart content closed initially and opens an empty, closable panel from the accessible header button", async () => {
    const { ui } = await setup();
    await ready(ui);
    expect(ui.getByTestId("room-service-room")).toBeTruthy();
    expect(ui.getByRole("button", { name: "Volver a servicios" })).toBeTruthy();
    expect(ui.getByRole("button", { name: "Carrito" })).toBeTruthy();
    expect(ui.getByTestId("room-service-cart-icon")).toBeTruthy();
    expect(ui.queryByTestId("room-service-cart-panel")).toBeNull();
    expect(ui.queryByTestId("room-service-notes")).toBeNull();
    expect(ui.queryByTestId("room-service-submit")).toBeNull();

    await openCart(ui);
    expect(ui.getByText("Aún no has agregado productos.")).toBeTruthy();
    expect(
      ui.getByTestId("room-service-next").props.accessibilityState.disabled,
    ).toBe(true);
    await fireEvent.press(ui.getByTestId("room-service-cart-close"));
    expect(ui.queryByTestId("room-service-cart-panel")).toBeNull();
  });

  it("renders categories and the approved mock catalog, including the nullable room context", async () => {
    const { ui } = await setup();
    await ready(ui);
    expect(
      ui.getByRole("button", { name: "Seleccionar categoría" }),
    ).toBeTruthy();
    expect(ui.getByTestId("room-service-category-value").props.children).toBe(
      "Desayunos",
    );
    expect(ui.getByText("Desayuno continental")).toBeTruthy();
    expect(ui.getByText("Q 75")).toBeTruthy();
    await selectCategory(ui, "LUNCH");
    expect(ui.getByTestId("room-service-category-value").props.children).toBe(
      "Almuerzos",
    );
    expect(ui.getByText("Club sándwich")).toBeTruthy();
    await selectCategory(ui, "BEVERAGES");
    expect(ui.getByText("Café")).toBeTruthy();

    const noRoom = await setup(
      undefined,
      new MockStayService({
        kind: "success",
        dto: { ...currentStayFixture, room: null },
      }),
    );
    await ready(noRoom.ui);
    expect(noRoom.ui.getByText("Habitación por asignar")).toBeTruthy();
  });

  it("keeps cart lines and multiline notes after closing and reopening the cart", async () => {
    const { ui } = await setup();
    await ready(ui);
    await fireEvent.press(
      ui.getByTestId("room-service-product-continental-breakfast-increment"),
    );
    await openCart(ui);
    expect(
      ui.getByTestId("room-service-cart-line-continental-breakfast"),
    ).toBeTruthy();
    expect(ui.getByTestId("room-service-total").props.children).toBe("Q 75");
    await fireEvent.changeText(
      ui.getByTestId("room-service-notes"),
      "Sin cebolla\nPor favor",
    );
    expect(ui.getByTestId("room-service-notes").props.maxLength).toBe(500);
    await fireEvent.press(ui.getByTestId("room-service-cart-close"));
    await openCart(ui);
    expect(
      ui.getByTestId("room-service-cart-line-continental-breakfast"),
    ).toBeTruthy();
    expect(ui.getByTestId("room-service-notes").props.value).toBe(
      "Sin cebolla\nPor favor",
    );
  });

  it("filters only the selected category by trimmed, case- and accent-insensitive search", async () => {
    const { ui } = await setup();
    await ready(ui);
    expect(ui.getByText("Desayuno típico")).toBeTruthy();
    await fireEvent.changeText(
      ui.getByTestId("room-service-search"),
      "  TÍPICO ",
    );
    expect(ui.getByText("Desayuno típico")).toBeTruthy();
    expect(ui.queryByText("Desayuno continental")).toBeNull();
    await fireEvent.changeText(ui.getByTestId("room-service-search"), "café");
    expect(
      ui.getByText("No encontramos productos en esta categoría."),
    ).toBeTruthy();
    await selectCategory(ui, "BEVERAGES");
    expect(ui.getByText("Café")).toBeTruthy();
  });

  it("returns to the cart meal period after closing an incompatible category warning", async () => {
    const { ui } = await setup();
    await ready(ui);
    await fireEvent.press(
      ui.getByTestId("room-service-product-continental-breakfast-increment"),
    );
    await selectCategory(ui, "LUNCH");
    expect(ui.getByTestId("room-service-category-value").props.children).toBe(
      "Almuerzos",
    );
    expect(ui.getByTestId("room-service-period-lock-notice")).toBeTruthy();
    expect(
      ui.getByText(
        "Tu pedido ya contiene productos de Desayunos. Para agregar productos de Almuerzos, elimina primero esos productos del carrito.",
      ),
    ).toBeTruthy();
    expect(
      ui.getByTestId("room-service-product-club-sandwich-increment").props
        .accessibilityState.disabled,
    ).toBe(true);
    await fireEvent.press(
      ui.getByTestId("room-service-product-club-sandwich-increment"),
    );
    expect(ui.getByTestId("room-service-cart-badge").props.children).toBe(1);
    await fireEvent.press(ui.getByTestId("room-service-period-lock-close"));
    expect(ui.getByTestId("room-service-category-value").props.children).toBe(
      "Desayunos",
    );
    await selectCategory(ui, "BEVERAGES");
    expect(ui.queryByTestId("room-service-period-lock-notice")).toBeNull();
    await fireEvent.press(
      ui.getByTestId("room-service-product-coffee-increment"),
    );
    await openCart(ui);
    await fireEvent.press(
      ui.getByTestId("room-service-cart-item-continental-breakfast-decrement"),
    );
    await fireEvent.press(ui.getByTestId("room-service-cart-close"));
    await selectCategory(ui, "LUNCH");
    expect(ui.getByTestId("room-service-category-value").props.children).toBe(
      "Almuerzos",
    );
  });

  it("manages quantities and derives the cart total in the panel", async () => {
    const { ui } = await setup();
    await ready(ui);
    await fireEvent.press(
      ui.getByTestId("room-service-product-continental-breakfast-increment"),
    );
    await fireEvent.press(
      ui.getByTestId("room-service-product-continental-breakfast-increment"),
    );
    await selectCategory(ui, "BEVERAGES");
    await fireEvent.press(
      ui.getByTestId("room-service-product-coffee-increment"),
    );
    await openCart(ui);
    expect(ui.getByTestId("room-service-total").props.children).toBe("Q 170");
    await fireEvent.press(
      ui.getByTestId("room-service-cart-item-continental-breakfast-decrement"),
    );
    await fireEvent.press(
      ui.getByTestId("room-service-cart-item-continental-breakfast-decrement"),
    );
    expect(
      ui.queryByTestId("room-service-cart-line-continental-breakfast"),
    ).toBeNull();
    expect(ui.getByTestId("room-service-total").props.children).toBe("Q 20");
    expect(ui.queryByTestId("room-service-remove-coffee")).toBeNull();
    expect(ui.getByTestId("room-service-cart-coffee")).toBeTruthy();
  });

  it("warns only when a create cart leaves the service flow and preserves it on cancel", async () => {
    const { ui } = await setup();
    await ready(ui);
    await fireEvent.press(
      ui.getByTestId("room-service-product-continental-breakfast-increment"),
    );
    await openCart(ui);
    await fireEvent.press(ui.getByTestId("room-service-cart-close"));
    expect(ui.queryByTestId("room-service-discard-modal")).toBeNull();
    await fireEvent.press(ui.getByTestId("room-service-back-arrow"));
    expect(ui.getByTestId("room-service-discard-modal")).toBeTruthy();
    await fireEvent.press(ui.getByTestId("room-service-discard-modal-cancel"));
    expect(ui.getByTestId("room-service-cart-badge").props.children).toBe(1);
  });

  it("caps each Room Service product at five while allowing independent lines and their total badge", async () => {
    const { ui } = await setup();
    await ready(ui);
    await selectCategory(ui, "BEVERAGES");
    for (let index = 0; index < 5; index += 1)
      await fireEvent.press(
        ui.getByTestId("room-service-product-coffee-increment"),
      );
    expect(
      ui.getByTestId("room-service-product-coffee-increment").props
        .accessibilityState.disabled,
    ).toBe(true);
    await fireEvent.press(
      ui.getByTestId("room-service-product-coffee-increment"),
    );
    expect(ui.getByLabelText("Cantidad de Café: 5")).toBeTruthy();
    await fireEvent.press(
      ui.getByTestId("room-service-product-natural-juice-increment"),
    );
    await fireEvent.press(
      ui.getByTestId("room-service-product-natural-juice-increment"),
    );
    await fireEvent.press(
      ui.getByTestId("room-service-product-natural-juice-increment"),
    );
    await fireEvent.press(
      ui.getByTestId("room-service-product-natural-juice-increment"),
    );
    await fireEvent.press(
      ui.getByTestId("room-service-product-natural-juice-increment"),
    );
    await openCart(ui);
    expect(ui.getByTestId("room-service-total").props.children).toBe("Q 225");
    expect(
      ui.getByTestId("room-service-cart-item-coffee-increment").props
        .accessibilityState.disabled,
    ).toBe(true);
    await fireEvent.press(ui.getByTestId("room-service-cart-close"));
    expect(ui.getByTestId("room-service-cart-badge").props.children).toBe(10);
  });

  it("uses the shared free-time picker, preserves the value on cancel, and enables submit only with an item and time", async () => {
    const { ui } = await setup();
    await ready(ui);
    await selectCategory(ui, "LUNCH");
    await fireEvent.press(
      ui.getByTestId("room-service-product-club-sandwich-increment"),
    );
    await openCart(ui);
    await fireEvent.press(ui.getByTestId("room-service-next"));
    await waitFor(() =>
      expect(ui.getByTestId("room-service-schedule-panel")).toBeTruthy(),
    );
    expect(ui.getByText("13:30")).toBeTruthy();
    expect(
      ui.getByTestId("room-service-submit").props.accessibilityState.disabled,
    ).toBe(false);
    await fireEvent.press(ui.getByTestId("room-service-delivery-picker"));
    expect(
      ui.getByTestId("room-service-delivery-time-picker-hour-00"),
    ).toBeTruthy();
    expect(
      ui.getByTestId("room-service-delivery-time-picker-minute-59"),
    ).toBeTruthy();
    await fireEvent.press(
      ui.getByTestId("room-service-delivery-time-picker-cancel"),
    );
    expect(ui.getByText("13:30")).toBeTruthy();
    await chooseDeliveryTime(ui);
    expect(ui.getByText("13:45")).toBeTruthy();
    expect(
      ui.getByTestId("room-service-submit").props.accessibilityState.disabled,
    ).toBe(false);
  });

  it("enforces the thirty-minute boundary in the picker, CTA, and stale submit guard", async () => {
    let now = new Date(2026, 8, 11, 13, 0, 0).getTime();
    const submitRequest = jest.fn<Promise<void>, [RoomServiceRequest]>(
      async () => undefined,
    );
    const { ui } = await setup(
      new MockRoomServiceService({ submitRequest }),
      new MockStayService(),
      () => now,
    );
    await ready(ui);
    await selectCategory(ui, "LUNCH");
    await fireEvent.press(
      ui.getByTestId("room-service-product-club-sandwich-increment"),
    );
    await openCart(ui);
    await fireEvent.press(ui.getByTestId("room-service-next"));
    await waitFor(() =>
      expect(ui.getByTestId("room-service-schedule-panel")).toBeTruthy(),
    );
    await fireEvent.press(ui.getByTestId("room-service-delivery-picker"));
    await fireEvent.press(
      ui.getByTestId("room-service-delivery-time-picker-hour-13"),
    );
    await fireEvent.press(
      ui.getByTestId("room-service-delivery-time-picker-minute-29"),
    );
    expect(
      ui.getByTestId("room-service-delivery-time-picker-confirm").props
        .accessibilityState.disabled,
    ).toBe(true);
    await fireEvent.press(
      ui.getByTestId("room-service-delivery-time-picker-minute-30"),
    );
    expect(
      ui.getByTestId("room-service-delivery-time-picker-confirm").props
        .accessibilityState.disabled,
    ).toBe(false);
    await fireEvent.press(
      ui.getByTestId("room-service-delivery-time-picker-confirm"),
    );
    expect(
      ui.getByTestId("room-service-submit").props.accessibilityState.disabled,
    ).toBe(false);
    now = new Date(2026, 8, 11, 13, 1, 0).getTime();
    await fireEvent.press(ui.getByTestId("room-service-submit"));
    expect(submitRequest).not.toHaveBeenCalled();
    expect(ui.getByTestId("room-service-schedule-error")).toBeTruthy();
  });

  it("marks Lunch unavailable on departure without Late checkout", async () => {
    const nowMs = () => new Date(2026, 8, 18, 11, 31).getTime();
    const { ui } = await setup(
      undefined,
      new MockStayService({
        kind: "success",
        dto: { ...currentStayFixture, departure: "2026-09-18" },
      }),
      nowMs,
    );
    await ready(ui);
    await selectCategory(ui, "LUNCH");
    expect(ui.getByTestId("room-service-category-unavailable")).toBeTruthy();
    expect(
      ui.getByTestId("room-service-product-club-sandwich-increment").props
        .accessibilityState.disabled,
    ).toBe(true);
  });

  it("does not restore Lunch on departure without Late checkout even before noon", async () => {
    const nowMs = () => new Date(2026, 8, 18, 10, 59).getTime();
    const { ui } = await setup(
      undefined,
      new MockStayService({
        kind: "success",
        dto: { ...currentStayFixture, departure: "2026-09-18" },
      }),
      nowMs,
    );
    await ready(ui);
    await selectCategory(ui, "LUNCH");
    expect(ui.getByTestId("room-service-category-unavailable")).toBeTruthy();
    expect(
      ui.getByTestId("room-service-product-club-sandwich-increment").props
        .accessibilityState.disabled,
    ).toBe(true);
  });

  it("keeps Lunch through 13:30, but not after, at 10:59 with Late checkout", async () => {
    const nowMs = () => new Date(2026, 8, 18, 10, 59).getTime();
    const { ui } = await setup(
      undefined,
      new MockStayService({
        kind: "success",
        dto: { ...currentStayFixture, departure: "2026-09-18" },
      }),
      nowMs,
      "14:00",
    );
    await ready(ui);
    await selectCategory(ui, "LUNCH");
    await fireEvent.press(
      ui.getByTestId("room-service-product-club-sandwich-increment"),
    );
    await openCart(ui);
    await fireEvent.press(ui.getByTestId("room-service-next"));
    await fireEvent.press(ui.getByTestId("room-service-delivery-picker"));
    await fireEvent.press(
      ui.getByTestId("room-service-delivery-time-picker-hour-13"),
    );
    await fireEvent.press(
      ui.getByTestId("room-service-delivery-time-picker-minute-30"),
    );
    await waitFor(() =>
      expect(
        ui.getByTestId("room-service-delivery-time-picker-confirm").props
          .accessibilityState.disabled,
      ).toBe(false),
    );
    await fireEvent.press(
      ui.getByTestId("room-service-delivery-time-picker-minute-31"),
    );
    await waitFor(() =>
      expect(
        ui.getByTestId("room-service-delivery-time-picker-confirm").props
          .accessibilityState.disabled,
      ).toBe(true),
    );
  });

  it.each(["", "   \n  "])(
    "omits whitespace-only notes from the request (%j)",
    async (notes) => {
      const submitRequest = jest.fn<Promise<void>, [RoomServiceRequest]>(
        async () => undefined,
      );
      const { ui } = await setup(new MockRoomServiceService({ submitRequest }));
      await ready(ui);
      await selectCategory(ui, "LUNCH");
      await fireEvent.press(
        ui.getByTestId("room-service-product-club-sandwich-increment"),
      );
      await openCart(ui);
      await fireEvent.changeText(ui.getByTestId("room-service-notes"), notes);
      await chooseDeliveryTime(ui);
      await fireEvent.press(ui.getByTestId("room-service-submit"));
      await waitFor(() =>
        expect(submitRequest).toHaveBeenCalledWith({
          items: [
            {
              itemFixtureKey: "club-sandwich",
              quantity: 1,
              mealPeriod: "LUNCH",
            },
          ],
          deliveryTime: "13:45",
          serviceDate: "2026-09-11",
        }),
      );
    },
  );

  it("trims multiline notes and sends no Stay, Reservation, Room, total, or price data", async () => {
    const submitRequest = jest.fn<Promise<void>, [RoomServiceRequest]>(
      async () => undefined,
    );
    const { ui } = await setup(
      new MockRoomServiceService({ submitRequest }),
      new MockStayService({
        kind: "success",
        dto: {
          ...currentStayFixture,
          id: "another-stay",
          reservationId: "another-reservation",
          room: { id: "another-room", number: "205" },
        },
      }),
      () => afternoonNowMs,
      undefined,
      false,
      {
        reservationId: "another-reservation",
        reservationStayId: "another-stay",
      },
    );
    await ready(ui);
    await selectCategory(ui, "LUNCH");
    await fireEvent.press(
      ui.getByTestId("room-service-product-club-sandwich-increment"),
    );
    await openCart(ui);
    await fireEvent.changeText(
      ui.getByTestId("room-service-notes"),
      "  Sin cebolla\nPor favor  ",
    );
    await chooseDeliveryTime(ui);
    await fireEvent.press(ui.getByTestId("room-service-submit"));
    await waitFor(() =>
      expect(submitRequest).toHaveBeenCalledWith({
        items: [
          { itemFixtureKey: "club-sandwich", quantity: 1, mealPeriod: "LUNCH" },
        ],
        deliveryTime: "13:45",
        serviceDate: "2026-09-11",
        notes: "Sin cebolla\nPor favor",
      }),
    );
    const request = submitRequest.mock.calls[0][0];
    for (const key of [
      "stayId",
      "reservationId",
      "roomId",
      "propertyId",
      "total",
      "priceAmount",
    ])
      expect(request).not.toHaveProperty(key);
  });

  it("shows submitting, blocks duplicate confirmation, and renders success only after resolution", async () => {
    const pending = deferred<void>();
    const submitRequest = jest.fn(() => pending.promise);
    const { ui } = await setup(new MockRoomServiceService({ submitRequest }));
    await ready(ui);
    await selectCategory(ui, "LUNCH");
    await fireEvent.press(
      ui.getByTestId("room-service-product-club-sandwich-increment"),
    );
    await openCart(ui);
    await chooseDeliveryTime(ui);
    await fireEvent.press(ui.getByTestId("room-service-submit"));
    await fireEvent.press(ui.getByTestId("room-service-submit"));
    await waitFor(() =>
      expect(ui.getByText("Enviando pedido...")).toBeTruthy(),
    );
    expect(submitRequest).toHaveBeenCalledTimes(1);
    expect(ui.queryByTestId("room-service-submit-success")).toBeNull();
    expect(
      ui.getByTestId("session-service-requests-probe").props.children,
    ).toBe("[]");
    await act(async () => pending.resolve());
    await waitFor(() =>
      expect(ui.getByTestId("room-service-submit-success")).toBeTruthy(),
    );
    expect(
      JSON.parse(
        ui.getByTestId("session-service-requests-probe").props.children,
      ),
    ).toEqual([
      expect.objectContaining({
        kind: "ROOM_SERVICE",
        origin: "SERVICES",
        status: "REQUESTED",
        title: "Room Service",
        summary: "11/09/2026 · 13:45 · 1 producto",
      }),
    ]);
  });

  it.each([
    ["error", new Error("technical failure")],
    ["offline", new NetworkError()],
  ] as const)(
    "keeps cart, notes, and delivery time on submit %s and retries",
    async (kind, error) => {
      const submitRequest = jest
        .fn<Promise<void>, [RoomServiceRequest]>()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(undefined);
      const { ui } = await setup(new MockRoomServiceService({ submitRequest }));
      await ready(ui);
      await selectCategory(ui, "LUNCH");
      await fireEvent.press(
        ui.getByTestId("room-service-product-club-sandwich-increment"),
      );
      await openCart(ui);
      await fireEvent.changeText(
        ui.getByTestId("room-service-notes"),
        "  Sin azúcar  ",
      );
      await chooseDeliveryTime(ui);
      await fireEvent.press(ui.getByTestId("room-service-submit"));
      await waitFor(() =>
        expect(ui.getByTestId(`room-service-submit-${kind}`)).toBeTruthy(),
      );
      expect(ui.getByTestId("room-service-schedule-panel")).toBeTruthy();
      expect(ui.getByText("13:45")).toBeTruthy();
      await fireEvent.press(ui.getByTestId("room-service-schedule-back"));
      expect(
        ui.getByTestId("room-service-cart-line-club-sandwich"),
      ).toBeTruthy();
      expect(ui.getByTestId("room-service-notes").props.value).toBe(
        "  Sin azúcar  ",
      );
      await fireEvent.press(ui.getByTestId("room-service-next"));
      await fireEvent.press(ui.getByTestId("room-service-submit"));
      await waitFor(() =>
        expect(ui.getByTestId("room-service-submit-success")).toBeTruthy(),
      );
      expect(submitRequest).toHaveBeenCalledTimes(2);
    },
  );

  it("distinguishes menu and shared Stay loading, generic error, offline, and retry", async () => {
    const pendingMenu = deferred<typeof roomServiceMenuFixture>();
    const loading = await setup(
      new MockRoomServiceService({ getMenu: () => pendingMenu.promise }),
    );
    await waitFor(() =>
      expect(loading.ui.getByTestId("room-service-menu-loading")).toBeTruthy(),
    );
    await act(async () => pendingMenu.resolve(roomServiceMenuFixture));
    await ready(loading.ui);

    const retryMenu = jest
      .fn()
      .mockRejectedValueOnce(new Error("menu failure"))
      .mockResolvedValueOnce(roomServiceMenuFixture);
    const generic = await setup(
      new MockRoomServiceService({ getMenu: retryMenu }),
    );
    await waitFor(() =>
      expect(generic.ui.getByTestId("room-service-menu-error")).toBeTruthy(),
    );
    await fireEvent.press(
      generic.ui.getByTestId("room-service-menu-error-action"),
    );
    await ready(generic.ui);
    expect(retryMenu).toHaveBeenCalledTimes(2);

    const menuOffline = await setup(
      new MockRoomServiceService({
        getMenu: async () => {
          throw new NetworkError();
        },
      }),
    );
    await waitFor(() =>
      expect(
        menuOffline.ui.getByTestId("room-service-menu-offline"),
      ).toBeTruthy(),
    );

    const stayRetry = jest
      .fn()
      .mockRejectedValueOnce(new NetworkError())
      .mockResolvedValueOnce(currentStayFixture);
    const stayOffline = await setup(undefined, { getCurrentStay: stayRetry });
    await waitFor(() =>
      expect(
        stayOffline.ui.getByTestId("room-service-stay-offline"),
      ).toBeTruthy(),
    );
    await fireEvent.press(
      stayOffline.ui.getByTestId("room-service-stay-offline-action"),
    );
    await ready(stayOffline.ui);
    expect(stayRetry).toHaveBeenCalledTimes(2);
  });

  it("opens from Services, keeps Servicios active, and returns through Back and success", async () => {
    const queryClient = client();
    const ui = await renderRouter(
      {
        _layout: () => (
          <AppClockProvider initialMode="IN_STAY">
            <QueryClientProvider client={queryClient}>
              <ActiveReservationContextProvider
                initialActiveReservationContext={activeReservationContext}
              >
                <GuestAuthSessionProvider>
                  <ActiveReservationContextProvider
                    initialActiveReservationContext={activeReservationContext}
                  >
                    <GuestNavigationMenuProvider>
                      <SessionServiceRequestsProvider>
                        <PathProbe />
                        <Slot />
                      </SessionServiceRequestsProvider>
                    </GuestNavigationMenuProvider>
                  </ActiveReservationContextProvider>
                </GuestAuthSessionProvider>
              </ActiveReservationContextProvider>
            </QueryClientProvider>
          </AppClockProvider>
        ),
        account: () => <Text testID="account-root">Cuenta</Text>,
        services: ServicesRoute,
        "services/room-service": RoomServiceRoute,
      },
      { initialUrl: "/services" },
    );
    await act(async () => router.replace("/services"));
    await waitFor(() =>
      expect(ui.getByTestId("services-room-service-launcher")).toBeTruthy(),
    );
    await fireEvent.press(ui.getByRole("button", { name: "Room Service" }));
    await waitFor(() =>
      expect(ui.getByTestId("room-service-cart-button")).toBeTruthy(),
    );
    expect(ui.getByTestId("pathname").props.children).toBe(
      "/services/room-service",
    );
    expect(
      ui.getByRole("tab", { name: "Servicios" }).props.accessibilityState
        .selected,
    ).toBe(true);
    await act(async () => router.back());
    expect(ui.getByTestId("pathname").props.children).toBe("/services");
    await fireEvent.press(
      await ui.findByTestId("services-room-service-launcher"),
    );
    await waitFor(() =>
      expect(ui.getByTestId("room-service-back-arrow")).toBeTruthy(),
    );
    expect(ui.getByTestId("guest-child-header-menu")).toBeTruthy();
    await fireEvent.press(ui.getByTestId("guest-child-header-menu"));
    await waitFor(() =>
      expect(ui.getByTestId("guest-navigation-drawer-panel")).toBeTruthy(),
    );
    await fireEvent.press(ui.getByTestId("guest-navigation-drawer-close"));
    await fireEvent.press(ui.getByTestId("room-service-back-arrow"));
    expect(ui.getByTestId("pathname").props.children).toBe("/services");
  });

  it("uses the shared drawer navigation guard for dirty carts without resetting on the current route", async () => {
    const queryClient = client();
    const ui = await renderRouter(
      {
        _layout: () => (
          <AppClockProvider initialMode="IN_STAY">
            <QueryClientProvider client={queryClient}>
              <ActiveReservationContextProvider
                initialActiveReservationContext={activeReservationContext}
              >
                <GuestAuthSessionProvider>
                  <ActiveReservationContextProvider
                    initialActiveReservationContext={activeReservationContext}
                  >
                    <GuestNavigationMenuProvider>
                      <SessionServiceRequestsProvider>
                        <PathProbe />
                        <Slot />
                      </SessionServiceRequestsProvider>
                    </GuestNavigationMenuProvider>
                  </ActiveReservationContextProvider>
                </GuestAuthSessionProvider>
              </ActiveReservationContextProvider>
            </QueryClientProvider>
          </AppClockProvider>
        ),
        account: () => <Text testID="account-root">Cuenta</Text>,
        services: ServicesRoute,
        "services/room-service": RoomServiceRoute,
      },
      { initialUrl: "/services/room-service" },
    );

    await waitFor(() =>
      expect(
        ui.getByTestId("room-service-product-continental-breakfast"),
      ).toBeTruthy(),
    );
    await fireEvent.press(
      ui.getByTestId("room-service-product-continental-breakfast-increment"),
    );

    await fireEvent.press(ui.getByTestId("guest-child-header-menu"));
    await waitFor(() =>
      expect(
        ui.getByTestId("guest-navigation-drawer-link-room-service"),
      ).toBeTruthy(),
    );
    await fireEvent.press(
      ui.getByTestId("guest-navigation-drawer-link-room-service"),
    );
    expect(ui.queryByTestId("guest-navigation-discard-modal")).toBeNull();
    expect(ui.getByTestId("room-service-cart-badge").props.children).toBe(1);

    await fireEvent.press(ui.getByTestId("guest-child-header-menu"));
    await fireEvent.press(
      ui.getByTestId("guest-navigation-drawer-section-stay"),
    );
    await fireEvent.press(
      ui.getByTestId("guest-navigation-drawer-link-inicio"),
    );
    await waitFor(() =>
      expect(ui.getByTestId("guest-navigation-discard-modal")).toBeTruthy(),
    );
    expect(ui.getByTestId("pathname").props.children).toBe(
      "/services/room-service",
    );
    await fireEvent.press(
      ui.getByTestId("guest-navigation-discard-modal-cancel"),
    );
    expect(ui.queryByTestId("guest-navigation-discard-modal")).toBeNull();
    expect(ui.getByTestId("room-service-cart-badge").props.children).toBe(1);

    await fireEvent.press(
      ui.getByTestId("guest-navigation-drawer-link-inicio"),
    );
    await waitFor(() =>
      expect(ui.getByTestId("guest-navigation-discard-modal")).toBeTruthy(),
    );
    await fireEvent.press(
      ui.getByTestId("guest-navigation-drawer-link-inicio"),
    );
    expect(ui.getAllByTestId("guest-navigation-discard-modal")).toHaveLength(1);
    await fireEvent.press(
      ui.getByTestId("guest-navigation-discard-modal-confirm"),
    );
    await waitFor(() => expect(ui.getByTestId("account-root")).toBeTruthy());
    expect(ui.queryByTestId("guest-navigation-discard-modal")).toBeNull();
    expect(ui.queryByTestId("guest-navigation-drawer-panel")).toBeNull();
  });

  it("closes the category selector only from its backdrop and preserves the active draft", async () => {
    const { ui } = await setup();
    await ready(ui);
    await fireEvent.press(
      ui.getByTestId("room-service-product-continental-breakfast-increment"),
    );
    await fireEvent.changeText(
      ui.getByTestId("room-service-search"),
      "continental",
    );
    await fireEvent.press(ui.getByTestId("room-service-category-selector"));
    await waitFor(() =>
      expect(ui.getByTestId("room-service-category-modal")).toBeTruthy(),
    );

    await fireEvent.press(ui.getByTestId("room-service-category-modal"));
    expect(ui.getByTestId("room-service-category-modal")).toBeTruthy();
    expect(ui.getByTestId("room-service-category-value").props.children).toBe(
      "Desayunos",
    );

    await fireEvent.press(ui.getByTestId("room-service-category-backdrop"));
    expect(ui.queryByTestId("room-service-category-modal")).toBeNull();
    expect(
      ui.getByTestId("room-service-product-continental-breakfast"),
    ).toBeTruthy();
    expect(ui.getByTestId("room-service-category-value").props.children).toBe(
      "Desayunos",
    );
    expect(ui.getByTestId("room-service-search").props.value).toBe(
      "continental",
    );
    expect(ui.getByTestId("room-service-cart-badge").props.children).toBe(1);
  });
});
