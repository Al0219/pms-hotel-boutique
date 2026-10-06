import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { mockServer } from "@/data/mocks/server";
import { GuestAccountGate, GuestSessionProvider } from "@/modules/auth";
import { PublicBookingShell, PublicBookingProvider } from "@/modules/booking";
import { setAuthToken } from "@/lib/http/interceptors";
import { AccountDashboardPage } from "./account-dashboard-page";
import type { AccountSummaryDTO } from "../dtos/account.dto";

const endpoint = "*/api/auth/guest/account/summary";
const session = { guestAccountId: "own", sessionId: "session-own", email: "own@example.test", context: "GUEST" };
const dto: AccountSummaryDTO = { guestAccountId: "own", email: session.email, active: true, profiles: [], linkedReservationsCount: 0, upcomingStay: null };
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://unrelated.invalid");
  mockServer.use(http.get("*/api/auth/guest/session", () => HttpResponse.json(session)));
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); setAuthToken(null); });
function setup(withPublicShell = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const content = <GuestAccountGate><AccountDashboardPage /></GuestAccountGate>;
  render(<QueryClientProvider client={client}><GuestSessionProvider>{withPublicShell ? <PublicBookingProvider><PublicBookingShell>{content}</PublicBookingShell></PublicBookingProvider> : content}</GuestSessionProvider></QueryClientProvider>);
  return { client, user: userEvent.setup() };
}

describe("Account dashboard through Guest BFF", () => {
  it("renders a real account without profile/stay, using same-origin GET without client UUID or Bearer", async () => {
    const requests: Request[] = [];
    setAuthToken("synthetic-staff-token");
    mockServer.use(http.get(endpoint, ({ request }) => { requests.push(request); return HttpResponse.json(dto); }));
    setup();
    expect(await screen.findByRole("heading", { name: "Mi cuenta" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sin perfil vinculado" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No tienes reservas vinculadas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No tienes próximas estancias confirmadas" })).toBeInTheDocument();
    expect(screen.queryByText("No se pudo cargar tu cuenta.")).not.toBeInTheDocument();
    const more = within(screen.getByRole("region", { name: "Más de tu cuenta" }));
    expect(more.getAllByRole("listitem")).toHaveLength(4);
    expect(more.getAllByText("Próximamente")).toHaveLength(4);
    for (const feature of ["Facturas", "Rewards", "Promociones", "Mensajes"]) expect(more.getByText(feature)).toBeInTheDocument();
    expect(more.queryByRole("link")).not.toBeInTheDocument();
    expect(more.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("Consulta aún no disponible")).not.toBeInTheDocument();
    expect(screen.queryByText(/Member|Gold|0 documentos|0 ofertas/)).not.toBeInTheDocument();
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("GET");
    const url = new URL(requests[0].url);
    expect(url.origin).toBe(window.location.origin); expect(url.search).toBe("");
    expect(requests[0].headers.has("authorization")).toBe(false);
  });
  it("keeps only the public header and one email, with three primary account cards", async () => {
    mockServer.use(http.get(endpoint, () => HttpResponse.json(dto)));
    setup(true);
    await screen.findByRole("heading", { name: "Mi cuenta", level: 1 });
    expect(screen.getAllByRole("banner")).toHaveLength(1);
    expect(screen.getAllByRole("navigation", { name: "Navegación pública" })).toHaveLength(1);
    expect(screen.queryByRole("navigation", { name: "Navegación principal" })).not.toBeInTheDocument();
    expect(screen.getAllByText(session.email)).toHaveLength(1);
    expect(within(screen.getByLabelText("Sesión de huésped")).getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Resumen de cuenta" })).getAllByRole("article")).toHaveLength(3);
  });
  it("renders all real linked profiles, nullable language and a persisted next stay", async () => {
    mockServer.use(http.get(endpoint, () => HttpResponse.json({ ...dto, linkedReservationsCount: 2,
      profiles: [{ profileId: "p1", firstName: "Real", lastName: "Guest", preferredLanguage: null, status: "ACTIVE" },
        { profileId: "p2", firstName: "Other", lastName: "Profile", preferredLanguage: "en", status: "INACTIVE" }],
      upcomingStay: { reservationId: "r1", stayId: "s1", confirmationCode: "CONF-REAL", arrival: "2026-12-01", departure: "2026-12-03" },
    })));
    setup(); await screen.findByRole("heading", { name: "Mi cuenta" });
    expect(screen.getByText("Real Guest · Idioma no indicado · Perfil activo")).toBeInTheDocument();
    expect(screen.getByText("Other Profile · en · Perfil inactivo")).toBeInTheDocument();
    expect(screen.getByText("CONF-REAL · 2026-12-01 → 2026-12-03")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2 reservas vinculadas" })).toBeInTheDocument();
  });
  it("treats no upcoming stay as valid even with historical links", async () => {
    mockServer.use(http.get(endpoint, () => HttpResponse.json({ ...dto, linkedReservationsCount: 1 })));
    setup();
    expect(await screen.findByRole("heading", { name: "No tienes próximas estancias confirmadas" })).toBeInTheDocument();
  });
  it("rechecks the real Guest session on summary 401 and returns to signed-out", async () => {
    let reads = 0;
    mockServer.use(http.get("*/api/auth/guest/session", () => ++reads === 1 ? HttpResponse.json(session) : new HttpResponse(null, { status: 401 })),
      http.get(endpoint, () => new HttpResponse(null, { status: 401 })));
    setup();
    expect(await screen.findByRole("heading", { name: "Accede a tu cuenta" })).toBeInTheDocument();
    expect(reads).toBe(2);
    expect(screen.queryByRole("heading", { name: "Mi cuenta" })).not.toBeInTheDocument();
  });
  it.each(["503", "network"])("keeps authenticated session on %s and retries summary", async failure => {
    let attempts = 0;
    mockServer.use(http.get(endpoint, () => {
      if (++attempts > 1) return HttpResponse.json(dto);
      return failure === "503" ? new HttpResponse(null, { status: 503 }) : HttpResponse.error();
    }));
    const { user } = setup();
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar tu cuenta");
    expect(screen.getByLabelText("Sesión de huésped")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "Mi cuenta" })).toBeInTheDocument(); expect(attempts).toBe(2);
  });
  it("does not store tokens/secondary-feature extras or another account's summary", async () => {
    mockServer.use(http.get(endpoint, () => HttpResponse.json({ ...dto, accessToken: "synthetic-access", refreshToken: "synthetic-refresh" })));
    const { client } = setup(); await screen.findByRole("heading", { name: "Mi cuenta" });
    expect(JSON.stringify(client.getQueryData(["guest", "account-summary", "own"]))).not.toMatch(/Token|synthetic-/);
  });
  it("rejects an inconsistent account scope in a BFF response", async () => {
    mockServer.use(http.get(endpoint, () => HttpResponse.json({ ...dto, guestAccountId: "someone-else" })));
    setup(); expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar tu cuenta");
    expect(screen.queryByRole("heading", { name: "Mi cuenta" })).not.toBeInTheDocument();
  });
});
