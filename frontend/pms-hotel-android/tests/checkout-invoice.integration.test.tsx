import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { renderRouter, waitFor } from 'expo-router/testing-library';
import { act, fireEvent } from '@testing-library/react-native';
import { createRef, forwardRef, useEffect, useImperativeHandle, type RefObject } from 'react';

import AccountRoute from '../app/(guest)/account';
import CheckoutRoute from '../app/(guest)/account/checkout';
import InvoiceRoute from '../app/(guest)/account/invoice';
import { NetworkError } from '@/data/remote/http/HttpError';
import {
  CheckoutScreen,
  CheckoutSessionProvider,
  type CheckoutRequest,
  type CheckoutService,
} from '@/modules/checkout';
import {
  SessionServiceRequestsProvider,
  useSessionServiceRequests,
} from '@/modules/service-requests';
import { buildRoomServiceSessionRequestInput } from '@/modules/services/room-service';
import { buildTransferSessionRequestInput } from '@/modules/valet';
import { GuestNavigationMenuProvider } from '@/modules/navigation';
import { ActiveReservationContextProvider, GuestAuthSessionProvider } from '@/modules/guest-auth';

type ControlledServiceMode = 'success' | 'generic-error' | 'offline';

interface ControlledCheckoutService {
  readonly service: CheckoutService;
  readonly callCount: number;
  readonly lastInput: CheckoutRequest | undefined;
}

interface SessionRequestsTestControl {
  requestId: string | undefined;
  transferRequestId: string | undefined;
  removeRoomService: () => boolean;
  removeTransfer: () => boolean;
  updateRoomService: () => boolean;
}

function createControlledService({ mode = 'success' }: { mode?: ControlledServiceMode } = {}): ControlledCheckoutService {
  let callCount = 0;
  let lastInput: CheckoutRequest | undefined;

  const submitCheckout: CheckoutService['submitCheckout'] = async (input) => {
    callCount += 1;
    lastInput = input;

    if (mode === 'generic-error') {
      throw new Error('checkout service failed');
    }

    if (mode === 'offline') {
      throw new NetworkError('checkout service offline');
    }

    return { completed: true };
  };

  return {
    service: {
      getFolio: async () => ({
        items: [],
        paidGuaranteeText: '',
        pendingBalanceText: '',
        totalStayText: '',
        totalText: '',
      }),
      getCheckout: async () => ({
        checks: [],
        departureNoteText: '',
        expectedDepartureText: '',
        roomDisplayText: 'Habitación por asignar',
        stayDatesText: '',
      }),
      getInvoice: async () => ({
        dateText: '',
        documentTypeText: '',
        referenceText: '',
        statusText: '',
        totalText: '',
      }),
      submitCheckout,
      generateInvoicePdf: async () => ({ fileDisplayText: 'PDF simulado generado' }),
      sendInvoiceEmail: async () => ({ confirmationText: 'Envío simulado' }),
    },
    get callCount() {
      return callCount;
    },
    get lastInput() {
      return lastInput;
    },
  };
}

function roomServiceRequestInput(summary = 'Café') {
  return buildRoomServiceSessionRequestInput({
    cart: { items: [{ itemFixtureKey: 'coffee', quantity: 1 }] },
    deliveryTime: '10:00',
    menu: {
      items: [
        {
          category: 'Bebidas',
          fixtureKey: 'coffee',
          name: 'Café',
          priceAmount: 20,
        },
      ],
    },
    serviceDate: '2099-08-30',
    summary,
  });
}

function SeedRoomService() {
  const { addRequest } = useSessionServiceRequests();

  useEffect(() => {
    addRequest(roomServiceRequestInput());
  }, [addRequest]);

  return null;
}

function SeedTransfer() {
  const { addRequest } = useSessionServiceRequests();

  useEffect(() => {
    addRequest(buildTransferSessionRequestInput({ destinationKey: 'airport', estimatedAmount: 120, fareText: 'Q 120', passengers: 2, scheduledAtMs: new Date(2099, 7, 30, 10).getTime(), summary: 'Traslado' }));
  }, [addRequest]);

  return null;
}

const SessionRequestsTestController = forwardRef<SessionRequestsTestControl>(function SessionRequestsTestController(_, ref) {
  const { removeRequest, requests, updateRequest } = useSessionServiceRequests();
  const roomService = requests.find((request) => request.kind === 'ROOM_SERVICE');
  const transfer = requests.find((request) => request.kind === 'TRANSFER');

  useImperativeHandle(ref, () => ({
    requestId: roomService?.sessionRequestId,
    transferRequestId: transfer?.sessionRequestId,
    removeRoomService: () => roomService ? removeRequest(roomService.sessionRequestId) : false,
    removeTransfer: () => transfer ? removeRequest(transfer.sessionRequestId) : false,
    updateRoomService: () => roomService
      ? updateRequest(roomService.sessionRequestId, roomServiceRequestInput('Café actualizado'))
      : false,
  }), [removeRequest, roomService, transfer, updateRequest]);

  return null;
});

function createGuestLayout(sessionControl?: RefObject<SessionRequestsTestControl | null>) {
  return function GuestLayout() {
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    });

    return (
      <QueryClientProvider client={queryClient}>
        <SessionServiceRequestsProvider>
          <CheckoutSessionProvider>
            <GuestAuthSessionProvider><ActiveReservationContextProvider><GuestNavigationMenuProvider>
              {sessionControl ? <SessionRequestsTestController ref={sessionControl} /> : null}
              <Slot />
            </GuestNavigationMenuProvider></ActiveReservationContextProvider></GuestAuthSessionProvider>
          </CheckoutSessionProvider>
        </SessionServiceRequestsProvider>
      </QueryClientProvider>
    );
  };
}

const GuestLayout = createGuestLayout();

function createControlledCheckoutRoute(
  controlled: ControlledCheckoutService,
  now = () => new Date('2026-09-18T08:00:00'),
  includeTransfer = false,
) {
  return function ControlledCheckoutRoute() {
    return (
      <>
        <SeedRoomService />
        {includeTransfer ? <SeedTransfer /> : null}
        <CheckoutScreen now={now} service={controlled.service} />
      </>
    );
  };
}

async function finishCheckout(ui: Awaited<ReturnType<typeof renderRouter>>) {
  await act(async () => {
    fireEvent.press(ui.getByTestId('checkout-submit'));
  });
  await waitFor(() => expect(ui.getByTestId('checkout-confirmation')).toBeTruthy());
  await act(async () => {
    fireEvent.press(ui.getByTestId('checkout-confirmation-confirm'));
  });
}

describe('Checkout / Invoice routes', () => {
  it('resolves Account through the Guest route tree', async () => {
    const ui = await renderRouter(
      {
        _layout: GuestLayout,
        account: AccountRoute,
        'account/checkout': CheckoutRoute,
        'account/invoice': InvoiceRoute,
      },
      { initialUrl: '/account' },
    );

    await waitFor(() => expect(ui.getByTestId('account-stay-hub-screen')).toBeTruthy());
  });

  it('resolves Checkout through the Guest route tree', async () => {
    const ui = await renderRouter(
      {
        _layout: GuestLayout,
        account: AccountRoute,
        'account/checkout': CheckoutRoute,
        'account/invoice': InvoiceRoute,
      },
      { initialUrl: '/account/checkout' },
    );

    await waitFor(() => expect(ui.getByTestId('checkout-screen')).toBeTruthy());
    expect(ui.getByText('Check-out')).toBeTruthy();
    expect(ui.queryByTestId('invoice-screen')).toBeNull();
    expect(ui.getByTestId('checkout-back')).toBeTruthy();
    expect(ui.getByTestId('guest-child-header-menu')).toBeTruthy();
    await act(async () => { fireEvent.press(ui.getByTestId('guest-child-header-menu')); });
    await waitFor(() => expect(ui.getByTestId('guest-navigation-drawer-panel')).toBeTruthy());
    await act(async () => { fireEvent.press(ui.getByTestId('guest-navigation-drawer-close')); });
    await act(async () => { fireEvent.press(ui.getByTestId('checkout-back')); });
    await waitFor(() => expect(ui.getByTestId('account-stay-hub-screen')).toBeTruthy());
  });

  it('returns direct Invoice without a snapshot to Account', async () => {
    const ui = await renderRouter(
      {
        _layout: GuestLayout,
        account: AccountRoute,
        'account/checkout': CheckoutRoute,
        'account/invoice': InvoiceRoute,
      },
      { initialUrl: '/account/invoice' },
    );

    await waitFor(() => expect(ui.getByTestId('invoice-no-snapshot')).toBeTruthy());
    expect(ui.getByTestId('guest-child-header-menu')).toBeTruthy();
    await act(async () => { fireEvent.press(ui.getByTestId('guest-child-header-menu')); });
    await waitFor(() => expect(ui.getByTestId('guest-navigation-drawer-panel')).toBeTruthy());
    await act(async () => { fireEvent.press(ui.getByTestId('guest-navigation-drawer-close')); });

    await act(async () => {
      fireEvent.press(ui.getByTestId('invoice-back'));
    });

    await waitFor(() => expect(ui.getByTestId('account-stay-hub-screen')).toBeTruthy());
  });
});

describe('Checkout mutation integration', () => {
  it('blocks checkout before the local departure date without a mutation', async () => {
    const controlled = createControlledService();
    const ControlledCheckoutRoute = createControlledCheckoutRoute(controlled, () => new Date('2026-09-17T23:59:00'));
    const ui = await renderRouter({ _layout: GuestLayout, 'account/checkout': ControlledCheckoutRoute, 'account/invoice': InvoiceRoute }, { initialUrl: '/account/checkout' });

    await waitFor(() => expect(ui.getByTestId('checkout-before-departure')).toBeTruthy());
    expect(ui.getByTestId('checkout-submit').props.accessibilityState.disabled).toBe(true);
    await act(async () => { fireEvent.press(ui.getByTestId('checkout-submit')); });
    expect(controlled.callCount).toBe(0);
    expect(ui.queryByTestId('checkout-confirmation')).toBeNull();
    expect(ui.queryByTestId('invoice-screen')).toBeNull();
  });

  it('requires final confirmation on and after departure', async () => {
    const controlled = createControlledService();
    const ControlledCheckoutRoute = createControlledCheckoutRoute(controlled, () => new Date('2026-09-19T08:00:00'));
    const ui = await renderRouter({ _layout: GuestLayout, 'account/checkout': ControlledCheckoutRoute, 'account/invoice': InvoiceRoute }, { initialUrl: '/account/checkout' });

    await waitFor(() => expect(ui.getByTestId('checkout-submit')).toBeTruthy());
    expect(ui.getByTestId('checkout-submit').props.accessibilityState.disabled).toBe(false);
    await act(async () => { fireEvent.press(ui.getByTestId('checkout-submit')); });
    await waitFor(() => expect(ui.getByTestId('checkout-confirmation')).toBeTruthy());
    expect(controlled.callCount).toBe(0);
    await act(async () => { fireEvent.press(ui.getByTestId('checkout-confirmation-cancel')); });
    expect(controlled.callCount).toBe(0);
    expect(ui.getByTestId('checkout-screen')).toBeTruthy();

    await finishCheckout(ui);
    await waitFor(() => expect(ui.getByTestId('invoice-screen')).toBeTruthy());
    expect(controlled.callCount).toBe(1);
  });

  it('uses React Query success with real session providers', async () => {
    const controlled = createControlledService();
    const ControlledCheckoutRoute = createControlledCheckoutRoute(controlled);
    const ui = await renderRouter(
      {
        _layout: GuestLayout,
        'account/checkout': ControlledCheckoutRoute,
        'account/invoice': InvoiceRoute,
      },
      { initialUrl: '/account/checkout' },
    );

    await waitFor(() => expect(ui.getByTestId('checkout-submit')).toBeTruthy());

    await finishCheckout(ui);

    await waitFor(() => expect(ui.getByTestId('invoice-screen')).toBeTruthy());
    expect(controlled.callCount).toBe(1);
    expect(controlled.lastInput).toEqual({});
  });

  it('keeps the frozen Invoice stable after live session update and delete', async () => {
    const controlled = createControlledService();
    const sessionControl = createRef<SessionRequestsTestControl>();
    const ControlledCheckoutRoute = createControlledCheckoutRoute(controlled, undefined, true);
    const ui = await renderRouter(
      {
        _layout: createGuestLayout(sessionControl),
        'account/checkout': ControlledCheckoutRoute,
        'account/invoice': InvoiceRoute,
      },
      { initialUrl: '/account/checkout' },
    );

    await waitFor(() => expect(sessionControl.current?.requestId).toBeTruthy());
    await waitFor(() => expect(sessionControl.current?.transferRequestId).toBeTruthy());
    await waitFor(() => expect(ui.getByTestId('checkout-submit')).toBeTruthy());

    await finishCheckout(ui);

    await waitFor(() => expect(ui.getByTestId('invoice-screen')).toBeTruthy());
    const referenceText = String(ui.getByTestId('invoice-reference').props.children);
    const generatedAtText = String(ui.getByTestId('invoice-generated-at').props.children);

    expect(ui.getByText('Room Service')).toBeTruthy();
    expect(ui.getByText('Café × 1')).toBeTruthy();
    expect(ui.getAllByText('Q 20')).toHaveLength(2);
    expect(ui.getByText('Tarifa estimada')).toBeTruthy();
    expect(ui.getByText('Total · Q140.00')).toBeTruthy();

    await act(async () => {
      expect(sessionControl.current?.updateRoomService()).toBe(true);
    });

    await waitFor(() => expect(sessionControl.current?.requestId).toBeTruthy());
    expect(ui.getByTestId('invoice-reference').props.children).toBe(referenceText);
    expect(ui.getByTestId('invoice-generated-at').props.children).toBe(generatedAtText);
    expect(ui.getByText('Café × 1')).toBeTruthy();

    await act(async () => {
      expect(sessionControl.current?.removeRoomService()).toBe(true);
      expect(sessionControl.current?.removeTransfer()).toBe(true);
    });

    await waitFor(() => expect(sessionControl.current?.requestId).toBeUndefined());
    expect(ui.getByTestId('invoice-reference').props.children).toBe(referenceText);
    expect(ui.getByTestId('invoice-generated-at').props.children).toBe(generatedAtText);
    expect(ui.getByText('Room Service')).toBeTruthy();
    expect(ui.getByText('Traslado · tarifa estimada')).toBeTruthy();
    expect(ui.getByText('Café × 1')).toBeTruthy();
    expect(ui.getAllByText('Q 20')).toHaveLength(2);
    expect(ui.getByText('Total · Q140.00')).toBeTruthy();
  });

  it('returns to Account rather than completed Checkout after success', async () => {
    const controlled = createControlledService();
    const ControlledCheckoutRoute = createControlledCheckoutRoute(controlled);
    const ui = await renderRouter(
      {
        _layout: GuestLayout,
        account: AccountRoute,
        'account/checkout': ControlledCheckoutRoute,
        'account/invoice': InvoiceRoute,
      },
      { initialUrl: '/account' },
    );

    await waitFor(() => expect(ui.getByTestId('account-checkout-launcher')).toBeTruthy());
    expect(ui.getByTestId('account-checkout-launcher-icon')).toBeTruthy();

    await act(async () => {
      fireEvent.press(ui.getByTestId('account-checkout-launcher'));
    });

    await waitFor(() => expect(ui.getByTestId('checkout-submit')).toBeTruthy());

    await finishCheckout(ui);

    await waitFor(() => expect(ui.getByTestId('invoice-screen')).toBeTruthy());

    await act(async () => {
      fireEvent.press(ui.getByTestId('invoice-back'));
    });

    await waitFor(() => expect(ui.getByTestId('account-stay-hub-screen')).toBeTruthy());
    expect(ui.queryByTestId('checkout-screen')).toBeNull();
    expect(ui.queryByTestId('invoice-screen')).toBeNull();
  });

  it('stays on Checkout when checkout service returns a generic error', async () => {
    const controlled = createControlledService({ mode: 'generic-error' });
    const ControlledCheckoutRoute = createControlledCheckoutRoute(controlled);
    const ui = await renderRouter(
      {
        _layout: GuestLayout,
        'account/checkout': ControlledCheckoutRoute,
        'account/invoice': InvoiceRoute,
      },
      { initialUrl: '/account/checkout' },
    );

    await waitFor(() => expect(ui.getByTestId('checkout-submit')).toBeTruthy());

    await finishCheckout(ui);

    await waitFor(() => expect(ui.getByText('No pudimos confirmar Check-out')).toBeTruthy());
    expect(controlled.callCount).toBe(1);
    expect(controlled.lastInput).toEqual({});
    expect(ui.getByTestId('checkout-screen')).toBeTruthy();
    expect(ui.getByText('Check-out')).toBeTruthy();
    expect(ui.queryByTestId('invoice-screen')).toBeNull();
    expect(ui.queryByTestId('invoice-no-snapshot')).toBeNull();
    expect(ui.getByLabelText('Reintentar')).toBeTruthy();
  });

  it('stays on Checkout and shows offline state for NetworkError', async () => {
    const controlled = createControlledService({ mode: 'offline' });
    const ControlledCheckoutRoute = createControlledCheckoutRoute(controlled);
    const ui = await renderRouter(
      {
        _layout: GuestLayout,
        'account/checkout': ControlledCheckoutRoute,
        'account/invoice': InvoiceRoute,
      },
      { initialUrl: '/account/checkout' },
    );

    await waitFor(() => expect(ui.getByTestId('checkout-submit')).toBeTruthy());

    await finishCheckout(ui);

    await waitFor(() => expect(ui.getByText('Sin conexión')).toBeTruthy());
    expect(controlled.callCount).toBe(1);
    expect(controlled.lastInput).toEqual({});
    expect(ui.getByTestId('checkout-screen')).toBeTruthy();
    expect(ui.getByText('Check-out')).toBeTruthy();
    expect(ui.queryByTestId('invoice-screen')).toBeNull();
    expect(ui.queryByTestId('invoice-no-snapshot')).toBeNull();
    expect(ui.getByLabelText('Reintentar')).toBeTruthy();
  });
});
