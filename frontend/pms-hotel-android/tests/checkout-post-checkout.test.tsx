import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActiveReservationContextProvider } from "@/modules/guest-auth";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { type PropsWithChildren, useLayoutEffect, useRef } from "react";

import {
  CheckoutSessionProvider,
  useCheckoutSession,
} from "@/modules/checkout";
import { SessionServiceRequestsProvider } from "@/modules/service-requests";
import { GuestNavigationShell } from "@/modules/navigation";
import { AmenitiesScreen } from "@/modules/services/amenities";
import { HousekeepingScreen } from "@/modules/services/housekeeping";
import { RoomServiceScreen } from "@/modules/services/room-service";
import { MockServicesService, ServicesScreen } from "@/modules/services";
import { SessionVehiclesProvider, ValetScreen } from "@/modules/valet";

const checkoutContent = {
  checks: [],
  departureNoteText: "",
  expectedDepartureText: "",
  roomDisplayText: "Habitación 204",
  stayDatesText: "",
};
const emptyFolio = {
  checkoutTotal: {
    amountMinor: 0,
    currency: "GTQ" as const,
    text: "Total · Q0.00",
  },
  items: [],
  paidGuaranteeText: "",
  pendingBalanceText: "",
  totalStayText: "Sin cargos registrados en esta sesión",
  totalText: "Total · Q0.00",
};

function CheckedOutSeed() {
  const { createSnapshot } = useCheckoutSession();
  const seeded = useRef(false);

  useLayoutEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    createSnapshot(checkoutContent, emptyFolio);
  }, [createSnapshot]);

  return null;
}

function CheckedOutProviders({ children }: PropsWithChildren) {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { gcTime: 0, retry: false },
      queries: { gcTime: 0, retry: false },
    },
  });

  return (
    <QueryClientProvider client={client}>
      <ActiveReservationContextProvider
        initialActiveReservationContext={activeReservationContext}
      >
        <SessionServiceRequestsProvider>
          <CheckoutSessionProvider>
            <CheckedOutSeed />
            <SessionVehiclesProvider>{children}</SessionVehiclesProvider>
          </CheckoutSessionProvider>
        </SessionServiceRequestsProvider>
      </ActiveReservationContextProvider>
    </QueryClientProvider>
  );
}

const activeReservationContext = {
  reservationId: "HB-2026-004281",
  reservationStayId: "stay-2026-004281",
};

describe("Checkout service gates", () => {
  it.each([
    [
      "Limpieza",
      <HousekeepingScreen key="housekeeping" />,
      "housekeeping-stay-completed",
      "housekeeping-creation-blocked",
      "housekeeping-post-checkout-body",
    ],
    [
      "Amenidades",
      <AmenitiesScreen key="amenities" />,
      "amenities-stay-completed",
      "amenities-creation-blocked",
      "amenities-post-checkout-body",
    ],
    [
      "Room Service",
      <RoomServiceScreen key="room-service" />,
      "room-service-stay-completed",
      "room-service-creation-blocked",
      "room-service-post-checkout-body",
    ],
  ])(
    "blocks direct %s creation after a checkout snapshot",
    async (_, screen, screenTestID, blockedTestID, bodyTestID) => {
      const ui = await render(
        <CheckedOutProviders>{screen}</CheckedOutProviders>,
      );
      await waitFor(() => expect(ui.getByTestId(screenTestID)).toBeTruthy());
      expect(ui.getByTestId(blockedTestID)).toBeTruthy();
      const postCheckoutBody = ui.getByTestId(bodyTestID);
      expect(postCheckoutBody).toHaveStyle({ flex: 1 });
      expect(postCheckoutBody.parent?.props.testID).toBe(screenTestID);
      expect(postCheckoutBody.parent?.props.children.at(-1).type).toBe(GuestNavigationShell);
      expect(ui.queryByText("Confirmar servicio")).toBeNull();
      expect(ui.queryByText("Confirmar pedido")).toBeNull();
      ui.unmount();
    },
  );

  it("blocks Late check-out after checkout while retaining Mis servicios", async () => {
    const ui = await render(
      <CheckedOutProviders>
        <ServicesScreen service={new MockServicesService()} />
      </CheckedOutProviders>,
    );
    await waitFor(() =>
      expect(ui.getByTestId("services-stay-completed")).toBeTruthy(),
    );
    await fireEvent.press(ui.getByTestId("service-card-late-check-out"));
    expect(
      ui.getByTestId("services-submit-button").props.accessibilityState
        .disabled,
    ).toBe(true);
    expect(
      ui.getByTestId("services-requests-launcher").props.accessibilityState
        .disabled,
    ).toBe(false);
    ui.unmount();
  });

  it("blocks every Valet action after checkout while retaining the root shell", async () => {
    const ui = await render(
      <CheckedOutProviders>
        <ValetScreen />
      </CheckedOutProviders>,
    );
    await waitFor(() =>
      expect(ui.getByTestId("valet-stay-completed")).toBeTruthy(),
    );
    expect(ui.getByTestId("valet-creation-blocked")).toBeTruthy();
    expect(ui.queryByTestId("valet-register-vehicle")).toBeNull();
    expect(ui.queryByTestId("valet-vehicle-card")).toBeNull();
    expect(ui.queryByTestId("valet-transfer-card")).toBeNull();
    ui.unmount();
  });
});
