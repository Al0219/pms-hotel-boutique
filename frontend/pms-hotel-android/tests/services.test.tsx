import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActiveReservationContextProvider } from "@/modules/guest-auth";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { act, renderRouter } from "expo-router/testing-library";
import { Pressable, Text } from "react-native";

import { NetworkError } from "@/data/remote/http/HttpError";
import {
  mapServicesCatalogFixtureDto,
  MockServicesService,
  ServicesScreen,
} from "@/modules/services";
import { servicesCatalogFixture } from "@/modules/services/data/mocks/servicesCatalogFixture";
import {
  SessionServiceRequestsProvider,
  useSessionServiceRequests,
} from "@/modules/service-requests";

declare const require: (moduleName: string) => {
  readFileSync(path: string, encoding: string): string;
};

function createDeferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve: resolve! };
}

function RequestProbe() {
  const { requests } = useSessionServiceRequests();
  return (
    <Text testID="session-service-requests-probe">
      {JSON.stringify(requests)}
    </Text>
  );
}

function LateCheckoutRemovalControl() {
  const { removeRequest, requests } = useSessionServiceRequests();
  const lateCheckout = requests.find(
    (request) => request.kind === "LATE_CHECKOUT",
  );
  return lateCheckout ? (
    <Pressable
      onPress={() => removeRequest(lateCheckout.sessionRequestId)}
      testID="late-checkout-removal-control"
    >
      <Text>Eliminar</Text>
    </Pressable>
  ) : null;
}

const inStayNowMs = new Date(2026, 8, 11, 10, 0).getTime();
async function renderServices(
  service: MockServicesService,
  nowMs: () => number = () => inStayNowMs,
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { gcTime: 0, retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ActiveReservationContextProvider
        initialActiveReservationContext={activeReservationContext}
      >
        <SessionServiceRequestsProvider>
          <RequestProbe />
          <LateCheckoutRemovalControl />
          <ServicesScreen nowMs={nowMs} service={service} />
        </SessionServiceRequestsProvider>
      </ActiveReservationContextProvider>
    </QueryClientProvider>,
  );
}

async function selectLateCheckOut(
  rendered: Awaited<ReturnType<typeof render>>,
) {
  await waitFor(() =>
    expect(rendered.getByTestId("services-screen")).toBeTruthy(),
  );
  await fireEvent.press(rendered.getByTestId("service-card-late-check-out"));
  await waitFor(() =>
    expect(rendered.getByTestId("services-selection")).toBeTruthy(),
  );
}

const activeReservationContext = {
  reservationId: "HB-2026-004281",
  reservationStayId: "stay-2026-004281",
};

describe("Services", () => {
  it("maps the approved fixture DTO to a UI-safe domain catalog", () => {
    expect(mapServicesCatalogFixtureDto(servicesCatalogFixture)).toEqual({
      context: servicesCatalogFixture.context,
      items: servicesCatalogFixture.items,
    });
  });

  it("contains no Special Decoration fixture or producer", () => {
    expect(servicesCatalogFixture.items).toEqual([
      expect.objectContaining({
        fixtureKey: "late-check-out",
        lateCheckoutUntil: "14:00",
      }),
    ]);
    expect(JSON.stringify(servicesCatalogFixture)).not.toContain(
      "special-decoration",
    );
  });

  it("renders Late check-out, dedicated-flow launchers, and V3 shell with Services active", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { gcTime: 0, retry: false },
        mutations: { retry: false },
      },
    });
    const ServicesRoute = () => (
      <QueryClientProvider client={queryClient}>
        <ActiveReservationContextProvider
          initialActiveReservationContext={activeReservationContext}
        >
          <SessionServiceRequestsProvider>
            <ServicesScreen
              nowMs={() => inStayNowMs}
              service={new MockServicesService()}
            />
          </SessionServiceRequestsProvider>
        </ActiveReservationContextProvider>
      </QueryClientProvider>
    );
    const rendered = await renderRouter(
      { services: ServicesRoute },
      { initialUrl: "/services" },
    );

    await waitFor(() =>
      expect(rendered.getByTestId("services-screen")).toBeTruthy(),
    );

    expect(rendered.getByText("Late check-out")).toBeTruthy();
    expect(rendered.getByText("Hasta las 14:00")).toBeTruthy();
    expect(rendered.getByText("Q 180")).toBeTruthy();
    expect(rendered.queryByText("Decoración especial")).toBeNull();
    expect(rendered.queryByText("Desayuno en habitación")).toBeNull();
    expect(rendered.queryByText("Traslado aeropuerto")).toBeNull();
    expect(rendered.getByRole("button", { name: "Limpieza" })).toBeTruthy();
    expect(rendered.getByRole("button", { name: "Room Service" })).toBeTruthy();
    expect(
      rendered.getByTestId("services-housekeeping-launcher-chevron"),
    ).toBeTruthy();
    expect(
      rendered.getByTestId("services-room-service-launcher-chevron"),
    ).toBeTruthy();
    expect(
      rendered.getByTestId("services-housekeeping-launcher-icon"),
    ).toBeTruthy();
    expect(
      rendered.getByTestId("services-room-service-launcher-icon"),
    ).toBeTruthy();
    expect(
      rendered.getByTestId("services-amenities-launcher-icon"),
    ).toBeTruthy();
    expect(
      rendered.getByTestId("services-requests-launcher-icon"),
    ).toBeTruthy();
    expect(
      rendered.getByLabelText("Servicios").props.accessibilityState,
    ).toEqual(
      expect.objectContaining({
        disabled: false,
        selected: true,
      }),
    );
    expect(rendered.queryByLabelText("Chat")).toBeNull();
    expect(
      rendered.getByLabelText("Valet").props.accessibilityState.disabled,
    ).toBe(false);
    expect(
      rendered.getByLabelText("Inicio").props.accessibilityState.disabled,
    ).toBe(false);
    expect(
      rendered.getByTestId("services-submit-button").props.accessibilityState
        .disabled,
    ).toBe(true);
  });

  it("uses the hotel-defined Late check-out schedule without guest date or time controls", async () => {
    const rendered = await renderServices(new MockServicesService());

    await selectLateCheckOut(rendered);

    expect(
      rendered.getByTestId("services-selection").props.children,
    ).toBeTruthy();
    expect(rendered.getAllByText("Late check-out").length).toBe(2);
    expect(rendered.getAllByText("Hasta las 14:00").length).toBe(2);
    expect(rendered.getAllByText("Q 180").length).toBe(2);
    expect(
      rendered.getByTestId("services-submit-button").props.accessibilityState
        .disabled,
    ).toBe(false);

    expect(
      rendered.getByTestId("services-late-checkout-schedule").props.children,
    ).toContain("Hasta 14:00");
    expect(rendered.queryByTestId("services-date-selector")).toBeNull();
    expect(rendered.queryByTestId("services-time-selector")).toBeNull();
  });

  it("shows submitting, disables the CTA, and prevents concurrent duplicate submission", async () => {
    const deferred = createDeferred<{ serviceFixtureKey: string }>();
    const submitRequest = jest.fn(() => deferred.promise);
    const rendered = await renderServices(
      new MockServicesService({ submitRequest }),
    );

    await selectLateCheckOut(rendered);
    const submitButton = rendered.getByTestId("services-submit-button");
    await fireEvent.press(submitButton);
    await fireEvent.press(submitButton);

    await waitFor(() =>
      expect(rendered.getByText("Confirmando...")).toBeTruthy(),
    );
    expect(
      rendered.getByTestId("services-submit-button").props.accessibilityState
        .disabled,
    ).toBe(true);
    expect(rendered.getByTestId("services-selection")).toBeTruthy();
    expect(submitRequest).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve({ serviceFixtureKey: "late-check-out" });
    });
    await waitFor(() =>
      expect(
        rendered.getByTestId("session-service-requests-probe"),
      ).toBeTruthy(),
    );
  });

  it("routes successful Late check-out requests to Account instead of a local success screen", async () => {
    const rendered = await renderServices(new MockServicesService());
    await selectLateCheckOut(rendered);
    await fireEvent.press(rendered.getByTestId("services-submit-button"));
    await waitFor(() =>
      expect(
        JSON.parse(
          rendered.getByTestId("session-service-requests-probe").props.children,
        ),
      ).toHaveLength(1),
    );
    expect(rendered.queryByText("Servicio solicitado")).toBeNull();
  });

  it("records only successful inline services with their approved presentation data", async () => {
    const submitRequest = jest.fn<
      Promise<{ serviceFixtureKey: string }>,
      [{ serviceFixtureKey: string }]
    >(async ({ serviceFixtureKey }) => ({ serviceFixtureKey }));
    const lateCheckout = await renderServices(
      new MockServicesService({ submitRequest }),
    );
    await selectLateCheckOut(lateCheckout);
    await fireEvent.press(lateCheckout.getByTestId("services-submit-button"));
    await waitFor(() =>
      expect(
        lateCheckout.getByTestId("session-service-requests-probe"),
      ).toBeTruthy(),
    );
    expect(
      JSON.parse(
        lateCheckout.getByTestId("session-service-requests-probe").props
          .children,
      ),
    ).toEqual([
      expect.objectContaining({
        kind: "LATE_CHECKOUT",
        origin: "SERVICES",
        status: "REQUESTED",
        title: "Late check-out",
        summary: expect.stringContaining("Hasta 14:00"),
        details: {
          type: "LATE_CHECKOUT",
          serviceDate: "2026-09-18",
          checkoutUntil: "14:00",
        },
      }),
    ]);
  });

  it("allows only one Late check-out until the existing request is removed", async () => {
    const nowSpy = jest
      .spyOn(Date, "now")
      .mockReturnValue(new Date(2026, 8, 18, 11, 29, 0, 0).getTime());

    try {
      const submitRequest = jest.fn<
        Promise<{ serviceFixtureKey: string }>,
        [{ serviceFixtureKey: string }]
      >(async ({ serviceFixtureKey }) => ({ serviceFixtureKey }));

      const rendered = await renderServices(
        new MockServicesService({ submitRequest }),
      );

      await selectLateCheckOut(rendered);
      await fireEvent.press(rendered.getByTestId("services-submit-button"));

      await waitFor(() =>
        expect(
          JSON.parse(
            rendered.getByTestId("session-service-requests-probe").props
              .children,
          ),
        ).toHaveLength(1),
      );

      await fireEvent.press(
        rendered.getByTestId("service-card-late-check-out"),
      );

      await waitFor(() =>
        expect(
          rendered.getByTestId("services-late-checkout-already-requested"),
        ).toBeTruthy(),
      );

      expect(
        rendered.getByTestId("services-submit-button").props.accessibilityState
          .disabled,
      ).toBe(true);

      expect(submitRequest).toHaveBeenCalledTimes(1);

      await fireEvent.press(
        rendered.getByTestId("late-checkout-removal-control"),
      );

      await waitFor(() =>
        expect(
          JSON.parse(
            rendered.getByTestId("session-service-requests-probe").props
              .children,
          ),
        ).toHaveLength(0),
      );

      await waitFor(() =>
        expect(
          rendered.getByTestId("services-submit-button").props
            .accessibilityState.disabled,
        ).toBe(false),
      );

      await fireEvent.press(rendered.getByTestId("services-submit-button"));

      await waitFor(() =>
        expect(
          JSON.parse(
            rendered.getByTestId("session-service-requests-probe").props
              .children,
          ),
        ).toHaveLength(1),
      );

      expect(submitRequest).toHaveBeenCalledTimes(2);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("shows generic submit error and retries the same selected fixture through a new mutation", async () => {
    const submitRequest = jest
      .fn<
        Promise<{ serviceFixtureKey: string }>,
        [{ serviceFixtureKey: string }]
      >()
      .mockRejectedValueOnce(new Error("mock failure"))
      .mockResolvedValueOnce({ serviceFixtureKey: "late-check-out" });
    const rendered = await renderServices(
      new MockServicesService({ submitRequest }),
    );

    await selectLateCheckOut(rendered);
    await fireEvent.press(rendered.getByTestId("services-submit-button"));
    await waitFor(() =>
      expect(rendered.getByTestId("services-submit-error")).toBeTruthy(),
    );
    expect(rendered.getByText("No pudimos enviar tu solicitud")).toBeTruthy();
    expect(rendered.getByText("Intenta nuevamente.")).toBeTruthy();
    expect(rendered.getByTestId("services-selection")).toBeTruthy();
    expect(rendered.queryByTestId("services-submit-button")).toBeNull();

    await fireEvent.press(rendered.getByText("Reintentar"));
    await waitFor(() =>
      expect(
        rendered.getByTestId("session-service-requests-probe"),
      ).toBeTruthy(),
    );
    expect(submitRequest).toHaveBeenCalledTimes(2);
    expect(submitRequest).toHaveBeenLastCalledWith({
      serviceFixtureKey: "late-check-out",
    });
  });

  it("distinguishes NetworkError submit offline and retries without queuing work", async () => {
    const submitRequest = jest
      .fn<
        Promise<{ serviceFixtureKey: string }>,
        [{ serviceFixtureKey: string }]
      >()
      .mockRejectedValueOnce(new NetworkError())
      .mockResolvedValueOnce({ serviceFixtureKey: "late-check-out" });
    const rendered = await renderServices(
      new MockServicesService({ submitRequest }),
    );

    await selectLateCheckOut(rendered);
    await fireEvent.press(rendered.getByTestId("services-submit-button"));
    await waitFor(() =>
      expect(rendered.getByTestId("services-submit-offline")).toBeTruthy(),
    );
    expect(rendered.getByText("Sin conexión")).toBeTruthy();
    expect(
      rendered.getByText("Conéctate a internet para solicitar este servicio."),
    ).toBeTruthy();
    expect(rendered.getByTestId("services-selection")).toBeTruthy();
    expect(rendered.queryByTestId("services-submit-button")).toBeNull();

    await fireEvent.press(rendered.getByText("Reintentar"));
    await waitFor(() =>
      expect(
        rendered.getByTestId("session-service-requests-probe"),
      ).toBeTruthy(),
    );
    expect(submitRequest).toHaveBeenCalledTimes(2);
  });

  it("represents catalog loading, generic error, and NetworkError offline independently from submit", async () => {
    const pendingCatalog = createDeferred<typeof servicesCatalogFixture>();
    const loading = await renderServices(
      new MockServicesService({ getCatalog: () => pendingCatalog.promise }),
    );
    expect(loading.getByTestId("services-catalog-loading")).toBeTruthy();

    await act(async () => {
      pendingCatalog.resolve(servicesCatalogFixture);
    });
    await waitFor(() =>
      expect(loading.getByTestId("services-screen")).toBeTruthy(),
    );
    await loading.unmount();

    const genericError = await renderServices(
      new MockServicesService({
        getCatalog: async () => {
          throw new Error("catalog failure");
        },
      }),
    );
    await waitFor(() =>
      expect(genericError.getByTestId("services-catalog-error")).toBeTruthy(),
    );
    expect(
      genericError.getByText("No pudimos cargar los servicios"),
    ).toBeTruthy();
    await genericError.unmount();

    const offline = await renderServices(
      new MockServicesService({
        getCatalog: async () => {
          throw new NetworkError();
        },
      }),
    );
    await waitFor(() =>
      expect(offline.getByTestId("services-catalog-offline")).toBeTruthy(),
    );
    expect(offline.getByText("Sin conexión")).toBeTruthy();
  });

  it("uses a local Services success overlay while preserving the shared footbar composition", () => {
    const fs = require("fs");
    const stylesSource = fs.readFileSync(
      "src/modules/services/presentation/servicesStyles.ts",
      "utf8",
    );
    const screenSource = fs.readFileSync(
      "src/modules/services/presentation/ServicesScreen.tsx",
      "utf8",
    );

    expect(stylesSource).toContain("overlayBackdrop");
    expect(stylesSource).toContain("successOverlayCard");
    expect(screenSource).toContain("successOverlayVisible");
    expect(screenSource).not.toContain("router.push('/services/success')");
    expect(screenSource).toContain("<GuestNavigationShell />");
    expect(screenSource).toContain("servicesStyles.screen");
  });
});
