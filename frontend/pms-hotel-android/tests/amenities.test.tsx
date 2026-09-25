import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActiveReservationContextProvider } from "@/modules/guest-auth";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { useLayoutEffect, useRef } from "react";
import { Text } from "react-native";

import { NetworkError } from "@/data/remote/http/HttpError";
import {
  CheckoutSessionProvider,
  useCheckoutSession,
} from "@/modules/checkout";
import {
  SessionServiceRequestsProvider,
  useSessionServiceRequests,
} from "@/modules/service-requests";
import {
  AMENITIES_MAX_ITEM_QUANTITY,
  amenitiesCatalogFixture,
  AmenitiesScreen,
  areAmenitiesRequestItemsValid,
  MockAmenitiesService,
  type AmenitiesRequest,
} from "@/modules/services/amenities";
import { updateAmenitiesQuantity } from "@/modules/services/amenities/presentation/AmenitiesScreen";
import { findFirstAvailableTime } from "@/shared/time";

function Probe() {
  const { requests } = useSessionServiceRequests();
  return <Text testID="amenities-requests">{JSON.stringify(requests)}</Text>;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const activeNowMs = new Date(2026, 8, 11, 13, 0).getTime();
const checkoutDueNowMs = new Date(2026, 8, 18, 12, 0).getTime();
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
async function setup(
  service = new MockAmenitiesService(),
  nowMs = () => activeNowMs,
  checkedOut = false,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const content = (
    <>
      <Probe />
      <AmenitiesScreen nowMs={nowMs} service={service} />
    </>
  );
  return render(
    <QueryClientProvider client={client}>
      <ActiveReservationContextProvider
        initialActiveReservationContext={activeReservationContext}
      >
        <SessionServiceRequestsProvider>
          {checkedOut ? (
            <CheckoutSessionProvider>
              <CheckedOutSeed />
              {content}
            </CheckoutSessionProvider>
          ) : (
            content
          )}
        </SessionServiceRequestsProvider>
      </ActiveReservationContextProvider>
    </QueryClientProvider>,
  );
}
async function enterSchedule(ui: Awaited<ReturnType<typeof render>>) {
  await fireEvent.press(ui.getByTestId("amenities-cart-button"));
  await waitFor(() => expect(ui.getByTestId("amenities-next")).toBeTruthy());
  await fireEvent.press(ui.getByTestId("amenities-next"));
  await waitFor(() => expect(ui.getByTestId("amenities-submit")).toBeTruthy());
}

const activeReservationContext = {
  reservationId: "HB-2026-004281",
  reservationStayId: "stay-2026-004281",
};

describe("Amenidades — IMP-AND-0113", () => {
  it("selects the first candidate allowed by the feature policy without inventing a fallback time", () => {
    expect(
      findFirstAvailableTime({
        candidates: ["00:00", "09:00", "09:30"],
        isValid: (time) => time >= "09:00",
      }),
    ).toBe("09:00");
    expect(
      findFirstAvailableTime({ candidates: ["00:00"], isValid: () => false }),
    ).toBeNull();
  });
  it("uses exactly the approved frontend/mock catalogue without prices", () => {
    expect(amenitiesCatalogFixture.map((item) => item.name)).toEqual([
      "Toallas adicionales",
      "Almohada adicional",
      "Kit dental",
      "Kit de aseo",
      "Pantuflas",
    ]);
    expect(JSON.stringify(amenitiesCatalogFixture)).not.toMatch(
      /price|stock|sku/i,
    );
  });
  it("keeps quantities between one and five, rejects invalid request items, and removes a zero line", () => {
    expect(updateAmenitiesQuantity([], "extra-towels", 1)).toEqual([
      { itemFixtureKey: "extra-towels", quantity: 1 },
    ]);
    expect(
      updateAmenitiesQuantity(
        [
          {
            itemFixtureKey: "extra-towels",
            quantity: AMENITIES_MAX_ITEM_QUANTITY,
          },
        ],
        "extra-towels",
        AMENITIES_MAX_ITEM_QUANTITY + 1,
      ),
    ).toEqual([
      { itemFixtureKey: "extra-towels", quantity: AMENITIES_MAX_ITEM_QUANTITY },
    ]);
    expect(
      updateAmenitiesQuantity(
        [{ itemFixtureKey: "extra-towels", quantity: 1 }],
        "extra-towels",
        0,
      ),
    ).toEqual([]);
    expect(
      areAmenitiesRequestItemsValid([
        {
          itemFixtureKey: "extra-towels",
          quantity: AMENITIES_MAX_ITEM_QUANTITY,
        },
      ]),
    ).toBe(true);
    expect(
      areAmenitiesRequestItemsValid([
        {
          itemFixtureKey: "extra-towels",
          quantity: AMENITIES_MAX_ITEM_QUANTITY + 1,
        },
      ]),
    ).toBe(false);
  });
  it("disables the Amenities increment in catalog and cart at five per line", async () => {
    const ui = await setup();
    await waitFor(() =>
      expect(
        ui.getByTestId("amenities-item-extra-towels-increment"),
      ).toBeTruthy(),
    );
    for (
      let quantity = 0;
      quantity < AMENITIES_MAX_ITEM_QUANTITY;
      quantity += 1
    )
      await fireEvent.press(
        ui.getByTestId("amenities-item-extra-towels-increment"),
      );
    expect(
      ui.getByTestId("amenities-item-extra-towels-increment").props
        .accessibilityState.disabled,
    ).toBe(true);
    await fireEvent.press(ui.getByTestId("amenities-cart-button"));
    expect(
      ui.getByTestId("amenities-cart-item-extra-towels-increment").props
        .accessibilityState.disabled,
    ).toBe(true);
    expect(
      ui.getAllByLabelText(
        `Cantidad de Toallas adicionales: ${AMENITIES_MAX_ITEM_QUANTITY}`,
      ).length,
    ).toBeGreaterThan(0);
  });
  it("separates catalog, cart notes, and scheduling with a quantity badge", async () => {
    const ui = await setup();
    await waitFor(() =>
      expect(ui.getByTestId("amenities-item-extra-towels")).toBeTruthy(),
    );
    expect(ui.queryByTestId("amenities-checkout-due")).toBeNull();
    expect(ui.getByTestId("amenities-cart-icon")).toBeTruthy();
    expect(ui.getByTestId("amenities-room")).toBeTruthy();
    expect(ui.queryByTestId("amenities-notes")).toBeNull();
    expect(ui.queryByTestId("amenities-submit")).toBeNull();
    await fireEvent.press(
      ui.getByTestId("amenities-item-extra-towels-increment"),
    );
    expect(ui.getByTestId("amenities-cart-badge").props.children).toBe(1);
    await fireEvent.press(ui.getByTestId("amenities-cart-button"));
    expect(ui.getByTestId("amenities-notes").props.maxLength).toBe(500);
    expect(ui.queryByTestId("amenities-time-selector")).toBeNull();
    await fireEvent.changeText(
      ui.getByTestId("amenities-notes"),
      "Puerta entreabierta\nGracias",
    );
    await fireEvent.press(ui.getByTestId("amenities-next"));
    expect(ui.getAllByText("Programar entrega")).toHaveLength(1);
    expect(ui.getByTestId("amenities-time-selector")).toBeTruthy();
    expect(ui.queryByTestId("amenities-notes")).toBeNull();
    await fireEvent.press(ui.getByTestId("amenities-back"));
    await fireEvent.press(ui.getByTestId("amenities-cart-button"));
    expect(ui.getByTestId("amenities-notes").props.value).toBe(
      "Puerta entreabierta\nGracias",
    );
  });
  it("closes the cart sheet without discarding its local draft", async () => {
    const ui = await setup();
    await waitFor(() =>
      expect(
        ui.getByTestId("amenities-item-extra-towels-increment"),
      ).toBeTruthy(),
    );
    await fireEvent.press(
      ui.getByTestId("amenities-item-extra-towels-increment"),
    );
    await fireEvent.press(ui.getByTestId("amenities-cart-button"));
    expect(ui.getByTestId("amenities-cart-sheet")).toBeTruthy();
    expect(ui.getByTestId("amenities-cart-sheet-footer")).toContainElement(
      ui.getByTestId("amenities-next"),
    );
    await fireEvent.press(ui.getByTestId("amenities-cart-sheet-backdrop"));
    expect(ui.queryByTestId("amenities-cart-sheet")).toBeNull();
    await fireEvent.press(ui.getByTestId("amenities-cart-button"));
    expect(ui.getByTestId("amenities-cart-badge").props.children).toBe(1);
  });
  it("trims notes, blocks duplicate submit, and creates a session request only after success", async () => {
    const pending = deferred<void>();
    const submitRequest = jest.fn(() => pending.promise);
    const ui = await setup(new MockAmenitiesService(submitRequest));
    await waitFor(() =>
      expect(
        ui.getByTestId("amenities-item-extra-towels-increment"),
      ).toBeTruthy(),
    );
    await fireEvent.press(
      ui.getByTestId("amenities-item-extra-towels-increment"),
    );
    await fireEvent.press(ui.getByTestId("amenities-cart-button"));
    await fireEvent.changeText(
      ui.getByTestId("amenities-notes"),
      "  Entregar en recepción\npor favor  ",
    );
    await fireEvent.press(ui.getByTestId("amenities-next"));
    await waitFor(() =>
      expect(ui.getByTestId("amenities-submit")).toBeTruthy(),
    );
    await fireEvent.press(ui.getByTestId("amenities-submit"));
    await fireEvent.press(ui.getByTestId("amenities-submit"));
    await waitFor(() => expect(submitRequest).toHaveBeenCalledTimes(1));
    expect(submitRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        notes: "Entregar en recepción\npor favor",
        items: [{ itemFixtureKey: "extra-towels", quantity: 1 }],
      }),
    );
    expect(ui.getByTestId("amenities-requests").props.children).toBe("[]");
    await act(async () => pending.resolve());
    await waitFor(() =>
      expect(ui.getByTestId("amenities-success")).toBeTruthy(),
    );
    expect(
      JSON.parse(ui.getByTestId("amenities-requests").props.children)[0],
    ).toEqual(
      expect.objectContaining({ kind: "AMENITIES", title: "Amenidades" }),
    );
  });
  it("warns only when a create draft leaves the service flow and preserves it on cancel", async () => {
    const ui = await setup();
    await waitFor(() =>
      expect(
        ui.getByTestId("amenities-item-extra-towels-increment"),
      ).toBeTruthy(),
    );
    await fireEvent.press(
      ui.getByTestId("amenities-item-extra-towels-increment"),
    );
    await fireEvent.press(ui.getByTestId("amenities-cart-button"));
    await fireEvent.press(ui.getByTestId("amenities-back"));
    expect(ui.queryByTestId("amenities-discard-modal")).toBeNull();
    await fireEvent.press(ui.getByTestId("amenities-back"));
    expect(ui.getByTestId("amenities-discard-modal")).toBeTruthy();
    await fireEvent.press(ui.getByTestId("amenities-discard-modal-cancel"));
    expect(ui.getByTestId("amenities-cart-badge").props.children).toBe(1);
  });
  it.each(["", "   \n  "])("omits whitespace notes (%s)", async (notes) => {
    const submitRequest = jest.fn<Promise<void>, [AmenitiesRequest]>(
      async () => undefined,
    );
    const ui = await setup(new MockAmenitiesService(submitRequest));
    await waitFor(() =>
      expect(
        ui.getByTestId("amenities-item-extra-towels-increment"),
      ).toBeTruthy(),
    );
    await fireEvent.press(
      ui.getByTestId("amenities-item-extra-towels-increment"),
    );
    await fireEvent.press(ui.getByTestId("amenities-cart-button"));
    await fireEvent.changeText(ui.getByTestId("amenities-notes"), notes);
    await fireEvent.press(ui.getByTestId("amenities-next"));
    await waitFor(() =>
      expect(ui.getByTestId("amenities-submit")).toBeTruthy(),
    );
    await fireEvent.press(ui.getByTestId("amenities-submit"));
    await waitFor(() =>
      expect(submitRequest).toHaveBeenCalledWith(
        expect.not.objectContaining({ notes: expect.anything() }),
      ),
    );
  });
  it.each([
    ["error", new Error("failure")],
    ["offline", new NetworkError()],
  ])(
    "keeps cart configuration and retries after submit %s",
    async (kind, error) => {
      const submitRequest = jest
        .fn<Promise<void>, [AmenitiesRequest]>()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(undefined);
      const ui = await setup(new MockAmenitiesService(submitRequest));
      await waitFor(() =>
        expect(
          ui.getByTestId("amenities-item-extra-towels-increment"),
        ).toBeTruthy(),
      );
      await fireEvent.press(
        ui.getByTestId("amenities-item-extra-towels-increment"),
      );
      await enterSchedule(ui);
      await fireEvent.press(ui.getByTestId("amenities-submit"));
      await waitFor(() =>
        expect(ui.getByTestId(`amenities-submit-${kind}`)).toBeTruthy(),
      );
      await fireEvent.press(ui.getByTestId("amenities-submit"));
      await waitFor(() =>
        expect(ui.getByTestId("amenities-success")).toBeTruthy(),
      );
    },
  );
  it("replaces the mutable form with the checkout CTA at effective checkout", async () => {
    const submitRequest = jest.fn<Promise<void>, [AmenitiesRequest]>(
      async () => undefined,
    );
    const ui = await setup(
      new MockAmenitiesService(submitRequest),
      () => checkoutDueNowMs,
    );
    await waitFor(() =>
      expect(ui.getByTestId("amenities-checkout-due")).toBeTruthy(),
    );
    expect(ui.getByTestId("amenities-checkout-due-action")).toBeTruthy();
    expect(ui.queryByTestId("amenities-item-extra-towels")).toBeNull();
    expect(ui.queryByTestId("amenities-cart-button")).toBeNull();
    expect(ui.queryByTestId("amenities-notes")).toBeNull();
    expect(ui.queryByTestId("amenities-date-selector")).toBeNull();
    expect(ui.queryByTestId("amenities-time-selector")).toBeNull();
    expect(ui.queryByTestId("amenities-submit")).toBeNull();
    expect(submitRequest).not.toHaveBeenCalled();
  });
  it("keeps the existing checked-out state ahead of checkout due", async () => {
    const ui = await setup(
      new MockAmenitiesService(),
      () => checkoutDueNowMs,
      true,
    );
    await waitFor(() =>
      expect(ui.getByTestId("amenities-stay-completed")).toBeTruthy(),
    );
    expect(ui.getByTestId("amenities-creation-blocked")).toBeTruthy();
    expect(ui.queryByTestId("amenities-checkout-due")).toBeNull();
    expect(ui.queryByTestId("amenities-submit")).toBeNull();
  });
  it.each([
    ["30 min mín.", () => activeNowMs],
    ["Hasta 12:00", () => new Date(2026, 8, 18, 11, 0).getTime()],
    ["No disponible", () => new Date(2026, 8, 18, 11, 31).getTime()],
  ])(
    "shows the compact availability hint %s in the active scheduling flow",
    async (label, nowMs) => {
      const ui = await setup(undefined, nowMs);
      await waitFor(() =>
        expect(
          ui.getByTestId("amenities-item-extra-towels-increment"),
        ).toBeTruthy(),
      );
      await fireEvent.press(
        ui.getByTestId("amenities-item-extra-towels-increment"),
      );
      await fireEvent.press(ui.getByTestId("amenities-cart-button"));
      await fireEvent.press(ui.getByTestId("amenities-next"));
      if (label === "No disponible") {
        expect(ui.getByTestId("amenities-no-availability")).toBeTruthy();
        expect(ui.queryByTestId("amenities-time-picker")).toBeNull();
      } else {
        await fireEvent.press(ui.getByTestId("amenities-time-selector"));
        expect(
          ui.getByTestId("amenities-time-picker-availability-hint"),
        ).toHaveTextContent(label);
      }
    },
  );
  it("keeps the confirmed wheel time through reopening, canceling, and submitting", async () => {
    const submitRequest = jest.fn<Promise<void>, [AmenitiesRequest]>(
      async () => undefined,
    );
    const ui = await setup(new MockAmenitiesService(submitRequest), () =>
      new Date(2026, 8, 11, 9, 30).getTime(),
    );
    await waitFor(() =>
      expect(
        ui.getByTestId("amenities-item-extra-towels-increment"),
      ).toBeTruthy(),
    );
    await fireEvent.press(
      ui.getByTestId("amenities-item-extra-towels-increment"),
    );
    await enterSchedule(ui);
    await waitFor(() =>
      expect(ui.getByTestId("amenities-time-selector")).toHaveTextContent(
        "10:00",
      ),
    );
    await fireEvent.press(ui.getByTestId("amenities-time-selector"));
    await fireEvent(
      ui.getByTestId("amenities-time-picker-hours"),
      "onMomentumScrollEnd",
      { nativeEvent: { contentOffset: { y: 13 * 48 } } },
    );
    await fireEvent(
      ui.getByTestId("amenities-time-picker-minutes"),
      "onMomentumScrollEnd",
      { nativeEvent: { contentOffset: { y: 45 * 48 } } },
    );
    await fireEvent.press(ui.getByTestId("amenities-time-picker-confirm"));
    await waitFor(() =>
      expect(ui.getByTestId("amenities-time-selector")).toHaveTextContent(
        "13:45",
      ),
    );
    await fireEvent.press(ui.getByTestId("amenities-time-selector"));
    await waitFor(() =>
      expect(
        ui.getByTestId("amenities-time-picker-hour-13").props.accessibilityState
          .selected,
      ).toBe(true),
    );
    await fireEvent(
      ui.getByTestId("amenities-time-picker-hours"),
      "onMomentumScrollEnd",
      { nativeEvent: { contentOffset: { y: 14 * 48 } } },
    );
    await fireEvent(
      ui.getByTestId("amenities-time-picker-minutes"),
      "onMomentumScrollEnd",
      { nativeEvent: { contentOffset: { y: 10 * 48 } } },
    );
    await fireEvent.press(ui.getByTestId("amenities-time-picker-cancel"));
    expect(ui.getByTestId("amenities-time-selector")).toHaveTextContent(
      "13:45",
    );
    await fireEvent.press(ui.getByTestId("amenities-submit"));
    await waitFor(() =>
      expect(submitRequest).toHaveBeenCalledWith(
        expect.objectContaining({ deliveryTime: "13:45" }),
      ),
    );
  });
});

describe("Amenities search and shared cart", () => {
  it("filters locally with trim, case and accent normalization without changing cart state", async () => {
    const ui = await setup();
    await waitFor(() =>
      expect(ui.getByTestId("amenities-search")).toBeTruthy(),
    );
    expect(ui.getByTestId("amenities-item-extra-towels")).toBeTruthy();
    await fireEvent.press(
      ui.getByTestId("amenities-item-extra-towels-increment"),
    );
    await fireEvent.changeText(
      ui.getByTestId("amenities-search"),
      "  TOÁLLAS  ",
    );
    expect(ui.getByTestId("amenities-item-extra-towels")).toBeTruthy();
    expect(ui.queryByTestId("amenities-item-extra-pillow")).toBeNull();
    expect(ui.getByTestId("amenities-cart-badge").props.children).toBe(1);
    await fireEvent.changeText(
      ui.getByTestId("amenities-search"),
      "sin coincidencias",
    );
    expect(ui.getByTestId("amenities-search-empty")).toBeTruthy();
    await fireEvent.changeText(ui.getByTestId("amenities-search"), "");
    expect(ui.getByTestId("amenities-item-extra-pillow")).toBeTruthy();
  });

  it("uses a fixed-footer, scrollable shared cart for multiple amenity lines", async () => {
    const ui = await setup();
    await waitFor(() =>
      expect(
        ui.getByTestId("amenities-item-extra-towels-increment"),
      ).toBeTruthy(),
    );
    await fireEvent.press(
      ui.getByTestId("amenities-item-extra-towels-increment"),
    );
    await fireEvent.press(
      ui.getByTestId("amenities-item-extra-pillow-increment"),
    );
    await fireEvent.press(ui.getByTestId("amenities-cart-button"));
    expect(ui.getByTestId("amenities-cart-sheet-body")).toBeTruthy();
    expect(ui.getByTestId("amenities-cart-extra-towels")).toBeTruthy();
    expect(ui.getByTestId("amenities-cart-extra-pillow")).toBeTruthy();
    expect(ui.getByTestId("amenities-cart-sheet-footer")).toContainElement(
      ui.getByTestId("amenities-next"),
    );
    await fireEvent.press(
      ui.getByTestId("amenities-cart-item-extra-towels-increment"),
    );
    expect(
      ui.getAllByLabelText("Cantidad de Toallas adicionales: 2").length,
    ).toBeGreaterThan(0);
  });
});

describe("Amenities sheet structure", () => {
  it("uses one active sheet at a time with fixed footers and preserves a four-item cart", async () => {
    const ui = await setup();
    await waitFor(() =>
      expect(
        ui.getByTestId("amenities-item-extra-towels-increment"),
      ).toBeTruthy(),
    );
    for (const key of [
      "extra-towels",
      "extra-pillow",
      "dental-kit",
      "toiletry-kit",
    ]) {
      await fireEvent.press(
        ui.getByTestId("amenities-item-" + key + "-increment"),
      );
    }
    await fireEvent.press(ui.getByTestId("amenities-cart-button"));
    expect(ui.getByTestId("amenities-cart-sheet-body")).toBeTruthy();
    for (const key of [
      "extra-towels",
      "extra-pillow",
      "dental-kit",
      "toiletry-kit",
    ]) {
      expect(ui.getByTestId("amenities-cart-" + key)).toBeTruthy();
    }
    expect(ui.getByTestId("amenities-cart-sheet-footer")).toContainElement(
      ui.getByTestId("amenities-next"),
    );
    await fireEvent.changeText(
      ui.getByTestId("amenities-notes"),
      "Puerta entreabierta",
    );
    await fireEvent.press(ui.getByTestId("amenities-next"));
    expect(ui.queryByTestId("amenities-cart-sheet")).toBeNull();
    expect(ui.getByTestId("amenities-schedule-sheet")).toBeTruthy();
    expect(ui.getByTestId("amenities-schedule-sheet-footer")).toContainElement(
      ui.getByTestId("amenities-submit"),
    );
    await fireEvent.press(ui.getByTestId("amenities-schedule-sheet-backdrop"));
    expect(ui.queryByTestId("amenities-schedule-sheet")).toBeNull();
    await fireEvent.press(ui.getByTestId("amenities-cart-button"));
    expect(ui.getByTestId("amenities-notes").props.value).toBe(
      "Puerta entreabierta",
    );
    expect(ui.getByTestId("amenities-cart-toiletry-kit")).toBeTruthy();
  });
});
