import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { useEffect } from "react";
import { Pressable, Text } from "react-native";
import { renderRouter } from "expo-router/testing-library";

import { NetworkError } from "@/data/remote/http/HttpError";
import { AccountStayHubScreen } from "@/modules/account";
import { ActiveReservationContextProvider, useActiveReservationContext } from "@/modules/guest-auth";
import { GuestNoticeProvider, useGuestNotice } from "@/modules/navigation";
import { type ReservationStayDto } from "@/modules/stay/data/dtos/ReservationStayDto";
import { currentStayFixture } from "@/modules/stay/data/mocks/currentStayFixture";
import { MockStayService } from "@/modules/stay/data/mocks/MockStayService";
import { type StayService } from "@/modules/stay/data/services/StayService";
import { SessionServiceRequestsProvider } from "@/modules/service-requests";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { gcTime: 0, retry: false } },
  });
}

function NoticeTrigger() {
  const { showServiceRequestSuccess } = useGuestNotice();
  useEffect(() => {
    showServiceRequestSuccess();
  }, [showServiceRequestSuccess]);
  return null;
}

function StaySwitcher() {
  const { setActiveReservationContext } = useActiveReservationContext();
  return <Pressable onPress={() => setActiveReservationContext({ reservationId: 'reservation-b', reservationStayId: 'stay-b' })}><Text>Cambiar a B</Text></Pressable>;
}

function createAccountRoute(service: StayService, withNotice = false, withSwitcher = false) {
  return function AccountRoute() {
    return (
      <QueryClientProvider client={createQueryClient()}>
        <ActiveReservationContextProvider
          initialActiveReservationContext={{
            reservationId: "HB-2026-004281",
            reservationStayId: "stay-2026-004281",
          }}
        >
          {withSwitcher ? <StaySwitcher /> : null}
          <GuestNoticeProvider>
            {withNotice ? <NoticeTrigger /> : null}
            <SessionServiceRequestsProvider>
              <AccountStayHubScreen service={service} />
            </SessionServiceRequestsProvider>
          </GuestNoticeProvider>
        </ActiveReservationContextProvider>
      </QueryClientProvider>
    );
  };
}

describe("Account / Stay Hub V3", () => {
  it("renders /account as Inicio from ReservationStay and selects Inicio in the shell", async () => {
    const AccountRoute = createAccountRoute(
      new MockStayService({ kind: "success", dto: currentStayFixture }),
    );
    const rendered = await renderRouter(
      { account: AccountRoute },
      { initialUrl: "/account" },
    );

    await waitFor(() =>
      expect(rendered.getByTestId("account-stay-hub-screen")).toBeTruthy(),
    );

    expect(rendered.queryByText("Mi estadía")).toBeNull();
    expect(rendered.queryByText("Tu reserva vinculada")).toBeNull();
    expect(rendered.queryByTestId("account-rewards-launcher")).toBeNull();
    expect(rendered.queryByTestId("account-promotions-launcher")).toBeNull();
    expect(rendered.getByText("Habitación 204")).toBeTruthy();
    expect(rendered.getByText("Deluxe King")).toBeTruthy();
    expect(rendered.getByText(/Check-out ·/)).toBeTruthy();
    expect(rendered.getByTestId("account-checkout-launcher")).toBeTruthy();
    expect(rendered.getByText("Reserva · HB-2026-004281")).toBeTruthy();
    expect(rendered.queryByText("REMOTE_STATUS")).toBeNull();
    expect(rendered.queryByTestId("account-stay-status")).toBeNull();
    expect(rendered.getAllByText("Inicio")).toHaveLength(2);
    expect(rendered.getByLabelText("Inicio").props.accessibilityState).toEqual({
      disabled: false,
      selected: true,
    });
    expect(
      rendered.getByLabelText("Servicios").props.accessibilityState,
    ).toEqual({ disabled: false, selected: false });
  });

  it("keeps room nullable without inventing an assignment", async () => {
    const unassignedStay: ReservationStayDto = {
      ...currentStayFixture,
      room: null,
    };
    const AccountRoute = createAccountRoute(
      new MockStayService({ kind: "success", dto: unassignedStay }),
    );
    const rendered = await renderRouter(
      { account: AccountRoute },
      { initialUrl: "/account" },
    );

    await waitFor(() =>
      expect(rendered.getByText("Habitación por asignar")).toBeTruthy(),
    );
    expect(rendered.queryByText("Habitación 204")).toBeNull();
  });

  it("represents loading, generic error, offline, and retry through the existing Stay service boundary", async () => {
    let resolveLoading: (value: ReservationStayDto) => void;
    const loadingPromise = new Promise<ReservationStayDto>((resolve) => {
      resolveLoading = resolve;
    });
    const LoadingRoute = createAccountRoute({
      getCurrentStay: () => loadingPromise,
    });
    const loading = await renderRouter(
      { account: LoadingRoute },
      { initialUrl: "/account" },
    );
    expect(loading.getByTestId("account-stay-loading")).toBeTruthy();
    resolveLoading!(currentStayFixture);
    await waitFor(() =>
      expect(loading.getByTestId("account-stay-hub-screen")).toBeTruthy(),
    );
    await loading.unmount();

    const ErrorRoute = createAccountRoute(
      new MockStayService({ kind: "error", error: new Error("mock failure") }),
    );
    const genericError = await renderRouter(
      { account: ErrorRoute },
      { initialUrl: "/account" },
    );
    await waitFor(() =>
      expect(genericError.getByTestId("account-stay-error")).toBeTruthy(),
    );
    await genericError.unmount();

    const getCurrentStay = jest
      .fn<Promise<ReservationStayDto>, []>()
      .mockRejectedValueOnce(new NetworkError("offline mock"))
      .mockResolvedValueOnce(currentStayFixture);
    const OfflineRoute = createAccountRoute({ getCurrentStay });
    const offline = await renderRouter(
      { account: OfflineRoute },
      { initialUrl: "/account" },
    );
    await waitFor(() =>
      expect(offline.getByTestId("account-stay-offline")).toBeTruthy(),
    );
    await fireEvent.press(offline.getByText("Reintentar"));
    await waitFor(() =>
      expect(offline.getByTestId("account-stay-hub-screen")).toBeTruthy(),
    );
    expect(getCurrentStay).toHaveBeenCalledTimes(2);
  });
});

describe("Account / service request confirmation", () => {
  it("shows the one-action confirmation after a submitted service handoff", async () => {
    const AccountRoute = createAccountRoute(
      new MockStayService({ kind: "success", dto: currentStayFixture }),
      true,
    );
    const rendered = await renderRouter(
      { account: AccountRoute },
      { initialUrl: "/account" },
    );
    await waitFor(() =>
      expect(
        rendered.getByTestId("account-service-request-submitted"),
      ).toBeTruthy(),
    );
    expect(rendered.getByTestId("account-stay-hub-screen")).toBeTruthy();
    expect(rendered.queryByTestId("account-rewards-launcher")).toBeNull();
    expect(
      rendered.getByLabelText("Inicio").props.accessibilityState.selected,
    ).toBe(true);
    expect(rendered.getByText("Solicitud enviada")).toBeTruthy();
    expect(
      rendered.getByText("Tu solicitud fue registrada correctamente."),
    ).toBeTruthy();
    expect(
      rendered.queryByTestId("account-service-request-submitted-cancel"),
    ).toBeNull();
    await fireEvent.press(
      rendered.getByTestId("account-service-request-submitted-confirm"),
    );
    await waitFor(() =>
      expect(
        rendered.queryByTestId("account-service-request-submitted"),
      ).toBeNull(),
    );
    expect(rendered.getByTestId("account-stay-hub-screen")).toBeTruthy();
  });
});

describe('Account reference presentation', () => {
  it.each([undefined, null, '', '   '])('shows neutral text for missing reference %s without displaying the internal ID', async (confirmationCode) => {
    const AccountRoute = createAccountRoute(new MockStayService({ kind: 'success', dto: { ...currentStayFixture, confirmationCode } }));
    const view = await renderRouter({ account: AccountRoute }, { initialUrl: '/account' });
    await waitFor(() => expect(view.getByText('Reserva · Referencia no disponible')).toBeTruthy());
    expect(view.queryByText(currentStayFixture.reservationId!)).toBeNull();
  });
  it('renders the provided reference and constrains long text to one line', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const AccountRoute = createAccountRoute({ getCurrentStay: async () => ({ ...currentStayFixture, reservationId: id, confirmationCode: 'ABC1234567' }) });
    const view = await renderRouter({ account: AccountRoute }, { initialUrl: '/account' });
    await waitFor(() => expect(view.getByText('Reserva · ABC1234567')).toBeTruthy());
    expect(view.queryByText(id)).toBeNull();
    expect(view.getByTestId('account-stay-reference').props).toMatchObject({ numberOfLines: 1, ellipsizeMode: 'tail' });
  });
  it.each([null, 'REFERENCE-B'])('uses only the selected stay reference after loading (B=%s)', async (confirmationCode) => {
    let resolveB!: (value: ReservationStayDto) => void;
    const pendingB = new Promise<ReservationStayDto>(resolve => { resolveB = resolve; });
    const getCurrentStay = jest.fn(context => context.reservationId === 'reservation-b' ? pendingB : Promise.resolve({ ...currentStayFixture, confirmationCode: 'REFERENCE-A' }));
    const AccountRoute = createAccountRoute({ getCurrentStay }, false, true);
    const view = await renderRouter({ account: AccountRoute }, { initialUrl: '/account' });
    await waitFor(() => expect(view.getByText('Reserva · REFERENCE-A')).toBeTruthy());
    await fireEvent.press(view.getByText('Cambiar a B'));
    await waitFor(() => expect(view.getByTestId('account-stay-loading')).toBeTruthy());
    expect(view.queryByText('Reserva · REFERENCE-A')).toBeNull();
    resolveB({ ...currentStayFixture, id: 'stay-b', reservationId: 'reservation-b', confirmationCode });
    await waitFor(() => expect(view.getByText(confirmationCode ? `Reserva · ${confirmationCode}` : 'Reserva · Referencia no disponible')).toBeTruthy());
    expect(view.queryByText('Reserva · REFERENCE-A')).toBeNull();
    expect(getCurrentStay).toHaveBeenLastCalledWith({ reservationId: 'reservation-b', reservationStayId: 'stay-b' });
  });
});

it('removes the two Inicio headings while retaining reservation data and checkout navigation',async()=>{
 const service={getCurrentStay:jest.fn(async()=>currentStayFixture)};const AccountRoute=createAccountRoute(service);
 const ui=await renderRouter({account:AccountRoute,'account/checkout':()=> <Text testID="checkout-destination">Check-out</Text>},{initialUrl:'/account'});
 await waitFor(()=>expect(ui.getByTestId('account-stay-reference')).toHaveTextContent('Reserva · HB-2026-004281'));
 expect(ui.queryByText('Mi estadía')).toBeNull();expect(ui.queryByText('Tu reserva vinculada')).toBeNull();
 expect(ui.getByText('Habitación 204')).toBeTruthy();expect(ui.getByText('Deluxe King')).toBeTruthy();expect(ui.getByText(/^28 .+–18 .+/)).toBeTruthy();expect(ui.getByText(/^Check-out · 18 /)).toBeTruthy();
 await fireEvent.press(ui.getByTestId('account-checkout-launcher'));await waitFor(()=>expect(ui.getByTestId('checkout-destination')).toBeTruthy());expect(service.getCurrentStay).toHaveBeenCalledTimes(1);
});
