import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { Text } from "react-native";

import { NetworkError } from "@/data/remote/http/HttpError";
import { MockLinkedReservationsService } from "@/modules/guest-auth/data/mocks/MockLinkedReservationsService";
import { type LinkedReservationsService } from "@/modules/guest-auth/data/services/LinkedReservationsService";
import {
  ActiveReservationContextProvider,
  GuestAuthSessionProvider,
  LinkedReservationsScreen,
  useActiveReservationContext,
} from "@/modules/guest-auth";

const primary = {
  reservationId: "HB-2026-004281",
  reservationStayId: "stay-2026-004281",
  reference: "HB-2026-004281",
  arrival: "2026-08-28",
  departure: "2026-09-18",
  roomLabel: "204",
};
const second = {
  reservationId: "HB-2026-004982",
  reservationStayId: "stay-2026-004982",
  reference: "HB-2026-004982",
  arrival: "2026-10-03",
  departure: "2026-10-09",
  roomLabel: "118",
};

function ContextProbe() {
  const { activeReservationContext } = useActiveReservationContext();
  return (
    <Text testID="active-context">
      {JSON.stringify(activeReservationContext)}
    </Text>
  );
}

async function setup(service: LinkedReservationsService) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return await render(
    <QueryClientProvider client={queryClient}>
      <GuestAuthSessionProvider
        initialSession={{ accountId: "guest-account-primary" }}
      >
        <ActiveReservationContextProvider>
          <ContextProbe />
          <LinkedReservationsScreen service={service} />
        </ActiveReservationContextProvider>
      </GuestAuthSessionProvider>
    </QueryClientProvider>,
  );
}

describe("Linked reservations and active context", () => {
  it("shows an explicit selection for multiple linked reservations and scopes the selected context", async () => {
    const replace = jest
      .spyOn(router, "replace")
      .mockImplementation(() => undefined as never);
    const screen = await setup(
      new MockLinkedReservationsService({
        scenario: { kind: "success", reservations: [primary, second] },
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("linked-reservations-screen")).toBeTruthy(),
    );
    expect(screen.getByText("Seleccionar estadía")).toBeTruthy();
    await fireEvent.press(
      screen.getByTestId("linked-reservation-stay-2026-004982"),
    );
    await fireEvent.press(screen.getByTestId("linked-reservations-continue"));
    expect(screen.getByTestId("active-context").children.join("")).toContain(
      "stay-2026-004982",
    );
    expect(replace).toHaveBeenCalledWith("/account");
    replace.mockRestore();
  });

  it("auto-selects exactly one linked reservation", async () => {
    const replace = jest
      .spyOn(router, "replace")
      .mockImplementation(() => undefined as never);
    const screen = await setup(
      new MockLinkedReservationsService({
        scenario: { kind: "success", reservations: [primary] },
      }),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/account"));
    expect(screen.getByTestId("active-context").children.join("")).toContain(
      "stay-2026-004281",
    );
    replace.mockRestore();
  });

  it("keeps an empty account explicit and offers Access", async () => {
    const replace = jest
      .spyOn(router, "replace")
      .mockImplementation(() => undefined as never);
    const screen = await setup(
      new MockLinkedReservationsService({
        scenario: { kind: "success", reservations: [] },
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId("linked-reservations-empty")).toBeTruthy(),
    );
    await fireEvent.press(
      screen.getByTestId("linked-reservations-empty-action"),
    );
    expect(replace).toHaveBeenCalledWith("/access");
    replace.mockRestore();
  });

  it.each([
    ["error", new Error("failed"), "linked-reservations-error"],
    ["offline", new NetworkError(), "linked-reservations-offline"],
  ])("keeps %s visible with retry", async (_kind, error, testID) => {
    const service = { listForAccount: jest.fn().mockRejectedValue(error) };
    const screen = await setup(service);
    await waitFor(() => expect(screen.getByTestId(testID)).toBeTruthy());
    expect(service.listForAccount).toHaveBeenCalledWith(
      "guest-account-primary",
    );
  });
});
