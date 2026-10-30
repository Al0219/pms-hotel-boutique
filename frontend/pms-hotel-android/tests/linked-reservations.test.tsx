import {createTestQueryClient} from '../src/test/queryClient';
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { BackHandler, Platform, Pressable, Text } from "react-native";

import {useGuestAuthSession} from "@/modules/guest-auth/presentation/GuestAuthSessionProvider";
import { NetworkError } from "@/data/remote/http/HttpError";
import { MockLinkedReservationsService } from "@/modules/guest-auth/data/mocks/MockLinkedReservationsService";
import { type LinkedReservationsService } from "@/modules/guest-auth/data/services/LinkedReservationsService";
import {
  ActiveReservationContextProvider,
  GuestAuthSessionProvider,
  LinkedReservationsScreen,
  useActiveReservationContext,
} from "@/modules/guest-auth";

// Navigation focus is supplied by Expo at runtime; these unit tests inject services without a navigator.
jest.mock('expo-router', () => ({ ...jest.requireActual('expo-router'), useFocusEffect: jest.fn() }));

const primary = {
  statusLabel: "RESERVED",
  reservationId: "HB-2026-004281",
  reservationStayId: "stay-2026-004281",
  reference: "HB-2026-004281",
  arrival: "2026-08-28",
  departure: "2026-09-18",
  roomLabel: "204",
};
const second = {
  statusLabel: "RESERVED",
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

async function setup(service: LinkedReservationsService, initialContext: { reservationId: string; reservationStayId: string } | null = null) {
  const queryClient = createTestQueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return await render(
    <QueryClientProvider client={queryClient}>
      <GuestAuthSessionProvider
        initialSession={{ accountId: "guest-account-primary" }}
      >
        <ActiveReservationContextProvider initialActiveReservationContext={initialContext}>
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

  it("changes an active stay only after confirmation while preserving the session", async () => {
    const replace = jest.spyOn(router, "replace").mockImplementation(() => undefined as never);
    const screen = await setup(new MockLinkedReservationsService({ scenario: { kind: "success", reservations: [primary, second] } }), { reservationId: primary.reservationId, reservationStayId: primary.reservationStayId });
    await waitFor(() => expect(screen.getByText("Estadía actual")).toBeTruthy());
    expect(screen.getByTestId("linked-reservations-cancel")).toBeTruthy();
    expect(screen.getByTestId("linked-reservations-continue").props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId("linked-reservation-stay-2026-004982"));
    await fireEvent.press(screen.getByTestId("linked-reservations-continue"));
    expect(screen.getByTestId("linked-reservations-change-confirmation")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("linked-reservations-change-confirmation-confirm"));
    await waitFor(() => expect(screen.getByTestId("active-context").children.join("")).toContain("stay-2026-004982"));
    expect(replace).toHaveBeenCalledWith("/account");
    replace.mockRestore();
  });

  it("consumes Android Back without changing the initial selection context", async () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
    let handler: Parameters<typeof BackHandler.addEventListener>[1] | undefined;
    const listener = jest.spyOn(BackHandler, "addEventListener").mockImplementation((_event, next) => { handler = next; return { remove: jest.fn() }; });
    const replace = jest.spyOn(router, "replace").mockImplementation(() => undefined as never);
    const screen = await setup(new MockLinkedReservationsService({ scenario: { kind: "success", reservations: [primary, second] } }));
    await waitFor(() => expect(screen.getByTestId("linked-reservations-screen")).toBeTruthy());
    expect(handler?.({} as never)).toBe(true);
    expect(screen.getByTestId("active-context").children.join("")).toContain("null");
    expect(replace).not.toHaveBeenCalled();
    listener.mockRestore();
    Object.defineProperty(Platform, "OS", { configurable: true, value: original });
    replace.mockRestore();
  });
});

it('keeps history behind filters and preserves context while searching and clearing',async()=>{
 const closed={...second,reservationStayId:'closed',statusLabel:'CHECKED_OUT',propertyLabel:'Hotel Histórico'};
 const active={...primary,statusLabel:'IN_HOUSE',propertyLabel:'Hotel Demo'};
 const ui=await setup(new MockLinkedReservationsService({scenario:{kind:'success',reservations:[closed,second,active]}}),{reservationId:primary.reservationId,reservationStayId:primary.reservationStayId});
 await waitFor(()=>expect(ui.getByTestId('linked-reservation-'+primary.reservationStayId)).toBeTruthy());
 expect(ui.queryByTestId('linked-reservation-closed')).toBeNull();expect(ui.queryByTestId('linked-filter-HISTORY')).toBeNull();
 await fireEvent.changeText(ui.getByTestId('linked-reservations-search'),'03/10/2026');expect(ui.queryByTestId('linked-reservation-'+primary.reservationStayId)).toBeNull();expect(ui.getByTestId('linked-reservation-'+second.reservationStayId)).toBeTruthy();
 await fireEvent.changeText(ui.getByTestId('linked-reservations-search'),'');await fireEvent.press(ui.getByTestId('linked-reservations-filters'));await fireEvent.press(ui.getByTestId('linked-filter-HISTORY'));await fireEvent.press(ui.getByText('Listo'));
 expect(ui.getByTestId('linked-reservation-closed')).toBeTruthy();expect(ui.queryByTestId('linked-reservation-'+primary.reservationStayId)).toBeNull();expect(ui.getByTestId('linked-reservations-filter-active')).toBeTruthy();
 expect(ui.getByTestId('active-context').children.join('')).toContain(primary.reservationStayId);
 await fireEvent.press(ui.getByTestId('linked-reservations-filters'));await fireEvent.changeText(ui.getByTestId('linked-filter-from'),'2026-10-01');await fireEvent.press(ui.getByTestId('linked-filters-clear'));await fireEvent.press(ui.getByText('Listo'));
 expect(ui.queryByTestId('linked-reservation-closed')).toBeNull();expect(ui.getByTestId('linked-reservation-'+primary.reservationStayId)).toBeTruthy();expect(ui.queryByTestId('linked-reservations-filter-active')).toBeNull();
});
it('never auto-selects a finished-only account; explicit history selection remains available',async()=>{
 const replace=jest.spyOn(router,'replace').mockImplementation(()=>undefined as never);
 const ui=await setup(new MockLinkedReservationsService({scenario:{kind:'success',reservations:[{...primary,statusLabel:'CHECKED_OUT'}]}}));
 await waitFor(()=>expect(ui.getByTestId('linked-reservations-no-results')).toBeTruthy());expect(replace).not.toHaveBeenCalled();
 await fireEvent.press(ui.getByTestId('linked-reservations-filters'));await fireEvent.press(ui.getByTestId('linked-filter-HISTORY'));await fireEvent.press(ui.getByText('Listo'));await fireEvent.press(ui.getByTestId('linked-reservation-'+primary.reservationStayId));await fireEvent.press(ui.getByTestId('linked-reservations-continue'));
 expect(replace).toHaveBeenCalledWith('/account');expect(ui.getByTestId('active-context').children.join('')).toContain(primary.reservationStayId);replace.mockRestore();
});

function SwitchAccountProbe(){const {beginSession}=useGuestAuthSession();return <Pressable testID="switch-account" onPress={()=>beginSession({accountId:'guest-second'})}><Text>Cambiar cuenta</Text></Pressable>;}
it('resets local selection and never displays another account list after changing session',async()=>{
 const listForAccount=jest.fn(async(account:string)=>account==='guest-account-primary'?[primary,second]:[{...primary,reservationStayId:'other-a'},{...second,reservationStayId:'other-b'}]);
 const client=createTestQueryClient({defaultOptions:{queries:{retry:false}}});
 const ui=await render(<QueryClientProvider client={client}><GuestAuthSessionProvider initialSession={{accountId:'guest-account-primary'}}><ActiveReservationContextProvider><SwitchAccountProbe/><LinkedReservationsScreen service={{listForAccount}}/></ActiveReservationContextProvider></GuestAuthSessionProvider></QueryClientProvider>);
 await waitFor(()=>expect(ui.getByTestId('linked-reservation-'+primary.reservationStayId)).toBeTruthy());await fireEvent.press(ui.getByTestId('linked-reservation-'+second.reservationStayId));expect(ui.getByTestId('linked-reservations-continue').props.accessibilityState.disabled).toBe(false);
 await fireEvent.press(ui.getByTestId('switch-account'));await waitFor(()=>expect(ui.getByTestId('linked-reservation-other-a')).toBeTruthy());expect(ui.queryByTestId('linked-reservation-'+primary.reservationStayId)).toBeNull();expect(ui.queryByTestId('linked-reservation-'+second.reservationStayId)).toBeNull();expect(ui.getByTestId('linked-reservations-continue').props.accessibilityState.disabled).toBe(true);expect(listForAccount).toHaveBeenLastCalledWith('guest-second');await ui.unmount();client.clear();
});
