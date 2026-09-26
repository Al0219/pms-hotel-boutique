import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import PrivateLayout from "../app/(private)/layout";
import { MultiPropertyDashboard, AvailabilitySearch, AvailabilityResults } from "@/modules/multi-property";
import { mockServer } from "@/data/mocks/server";
import { private09Keys, initialStaffIdentity } from "@/data/mocks/private-09";
import { private07Keys } from "@/data/mocks/private-07";
import { SessionsPage } from "@/modules/security";
const navigation = vi.hoisted(() => ({ push: vi.fn(), pathname: "/multi-property" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname, useRouter: () => ({ push: navigation.push }) }));
const clients: QueryClient[] = [];
function mount(page: ReactNode = <MultiPropertyDashboard />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}><PrivateLayout>{page}</PrivateLayout></QueryClientProvider>);
}
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true"); navigation.push.mockClear(); navigation.pathname = "/multi-property"; });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.restoreAllMocks(); vi.unstubAllEnvs(); onlineManager.setOnline(true); });
describe("Private 09 frontend journeys", () => {
  it("switches property, preserves role, scopes queries and persists reload", async () => {
    const user = userEvent.setup(); mount();
    const region = await screen.findByRole("region", { name: "Métricas por propiedad" });
    expect(within(region).getByText(/Hotel Boutique Huehue/)).toBeInTheDocument();
    expect(within(region).queryByText(/Hotel Boutique Antigua/)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Propiedad"), "GT-HB-03");
    await waitFor(() => expect(screen.getByRole("region", { name: "Métricas por propiedad" })).toHaveTextContent("Hotel Boutique Antigua"));
    expect(screen.getByText("Gerencia · Sesión de demostración")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Métricas por propiedad" })).not.toHaveTextContent("Hotel Boutique Huehue");
    cleanup(); mount();
    await screen.findByRole("region", { name: "Métricas por propiedad" });
    expect(screen.getByLabelText("Propiedad")).toHaveValue("GT-HB-03");
  });
  it("shows consolidated authorized metrics when global is explicitly selected", async () => {
    const user = userEvent.setup(); mount();
    await user.selectOptions(await screen.findByLabelText("Propiedad"), "ALL_PROPERTIES");
    await waitFor(() => expect(screen.getByRole("region", { name: "Métricas por propiedad" })).toHaveTextContent("Hotel Boutique Antigua"));
    expect(screen.getByText("158 / 200 room-nights")).toBeInTheDocument();
    expect(screen.getByText("79.0%")).toBeInTheDocument();
  });
  it("does not query metrics with a stale unauthorized saved scope", async () => {
    let requests = 0;
    mockServer.use(http.get("*/__mock/private-09/metrics", () => { requests++; return HttpResponse.json({ metrics: [] }); }));
    sessionStorage.setItem("pms:private-09:scope:staff-current", "NOT-AUTHORIZED");
    mount(); await screen.findByText("Selecciona una propiedad autorizada en el encabezado para continuar.");
    expect(requests).toBe(0);
    expect(screen.queryByRole("region", { name: "Métricas por propiedad" })).not.toBeInTheDocument();
  });
  it("hides inactive properties and global comparison for Reception", async () => {
    const identity = initialStaffIdentity(); identity.role_id = "recepcion"; identity.memberships[1].status = "INACTIVE";
    localStorage.setItem(private09Keys.identity, JSON.stringify(identity));
    mount(); await screen.findByRole("region", { name: "Métricas por propiedad" });
    expect(screen.queryByRole("option", { name: /Antigua/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Todas mis propiedades/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Comparar disponibilidad" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reservas" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Roles / Permisos" })).not.toBeInTheDocument();
  });
  it("renders empty memberships without a global fallback", async () => {
    const identity = initialStaffIdentity(); identity.memberships = [];
    localStorage.setItem(private09Keys.identity, JSON.stringify(identity));
    mount(); await screen.findByText("No hay un contexto autorizado seleccionado.");
    expect(screen.getByLabelText("Propiedad")).toBeDisabled();
  });
  it("handles loading, errors, retry and empty results", async () => {
    const user = userEvent.setup();
    localStorage.setItem(private09Keys.scenario, "error");
    mount(); await screen.findByText("Cargando datos de las propiedades seleccionadas…");
    await screen.findByText("No se pudieron cargar los datos de este contexto.");
    localStorage.setItem(private09Keys.scenario, "empty");
    await user.click(screen.getByRole("button", { name: "Reintentar consulta" }));
    await screen.findByText("No hay datos para las propiedades y los criterios seleccionados.");
  });
  it("waits offline without presenting fabricated data", async () => {
    onlineManager.setOnline(false); mount();
    expect(screen.getByText("Sin conexión. Esperando para cargar la sesión Staff.")).toBeInTheDocument();
    act(() => onlineManager.setOnline(true));
    await screen.findByRole("region", { name: "Métricas por propiedad" });
  });
  it("validates dates and submits the actual search criteria", async () => {
    const user = userEvent.setup(); mount(<AvailabilitySearch />);
    await screen.findByLabelText("Entrada");
    await user.clear(screen.getByLabelText("Salida")); await user.type(screen.getByLabelText("Salida"), "2026-09-11");
    await user.click(screen.getByRole("button", { name: "Buscar disponibilidad" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("salida posterior");
    expect(navigation.push).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText("Salida")); await user.type(screen.getByLabelText("Salida"), "2026-09-14");
    await user.type(screen.getByLabelText("Tipo de habitación"), "King");
    await user.click(screen.getByRole("button", { name: "Buscar disponibilidad" }));
    expect(navigation.push).toHaveBeenCalledWith("/multi-property/disponibilidad/resultados?start=2026-09-12&end=2026-09-14&roomType=King");
  });
  it("filters comparison by scope, room type and dates", async () => {
    sessionStorage.setItem("pms:private-09:scope:staff-current", "ALL_PROPERTIES");
    mount(<AvailabilityResults criteria={{ startDate: "2026-09-12", endDate: "2026-09-14", roomType: "King" }} />);
    const table = await screen.findByRole("region", { name: "Disponibilidad por propiedad y fecha" });
    expect(table).toHaveTextContent("Deluxe King"); expect(table).toHaveTextContent("Patio King");
    expect(table).not.toHaveTextContent("Standard Twin");
    expect(table).toHaveTextContent("America/Guatemala");
    expect(screen.queryByRole("button", { name: "Evaluar rebooking" })).not.toBeInTheDocument();
  });
  it("rejects a response containing data outside the authorized scope", async () => {
    mockServer.use(http.get("*/__mock/private-09/metrics", () => HttpResponse.json({ metrics: [{ property_id: "UNAUTHORIZED", currency: "GTQ", date: "2026-09-08", sold_room_nights: 1, available_room_nights: 1, net_revenue: "10" }] })));
    mount(); await screen.findByText("No se pudieron cargar los datos de este contexto.");
    expect(screen.queryByText("UNAUTHORIZED")).not.toBeInTheDocument();
  });
  it("closes the same Private 07 session, keeps Guest data and persists logout", async () => {
    const user = userEvent.setup(); localStorage.setItem("guest-example", "preserved"); mount();
    await user.click(await screen.findByRole("button", { name: "Cerrar sesión" }));
    await screen.findByRole("heading", { name: "Sesión Staff cerrada" });
    expect(JSON.parse(localStorage.getItem(private07Keys.security)!).sessions[0].status).toBe("closed");
    expect(localStorage.getItem("guest-example")).toBe("preserved");
    expect(screen.queryByRole("heading", { name: "Dashboard Multi-property" })).not.toBeInTheDocument();
    cleanup(); mount(); await screen.findByRole("heading", { name: "Sesión Staff cerrada" });
    await user.click(screen.getByRole("button", { name: "Iniciar demostración Staff" }));
    await screen.findByRole("region", { name: "Métricas por propiedad" });
  });
  it("keeps content visible when logout fails and allows retry", async () => {
    const user = userEvent.setup(); mount(); await screen.findByRole("region", { name: "Métricas por propiedad" });
    const storage = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await screen.findByText("No se pudo cerrar la sesión. Inténtalo nuevamente.");
    expect(screen.getByRole("heading", { name: "Dashboard Multi-property" })).toBeInTheDocument();
    storage.mockRestore(); await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await screen.findByRole("heading", { name: "Sesión Staff cerrada" });
  });
  it("does not display the previous property while the new query is delayed", async () => {
    const user = userEvent.setup(); mount(); await screen.findByRole("region", { name: "Métricas por propiedad" });
    mockServer.use(http.get("*/__mock/private-09/metrics", async () => { await delay(150); return HttpResponse.json({ metrics: [] }); }));
    await user.selectOptions(screen.getByLabelText("Propiedad"), "GT-HB-03");
    expect(screen.queryByRole("region", { name: "Métricas por propiedad" })).not.toBeInTheDocument();
    await screen.findByText("No hay datos para las propiedades y los criterios seleccionados.");
  });
  it("shares session state with the existing security page", async () => {
    navigation.pathname = "/seguridad/sesiones"; mount(<SessionsPage />);
    await screen.findByRole("button", { name: "Cerrar sesión" });
    expect(screen.queryByLabelText("Propiedad")).not.toBeInTheDocument();
    expect(screen.getByText("Este módulo conserva su contexto de propiedad.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Security/ })).toBeInTheDocument();
  });
});
