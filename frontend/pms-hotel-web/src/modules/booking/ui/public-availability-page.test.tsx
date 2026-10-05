import React from "react";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { delay, http, HttpResponse } from "msw";
import { mockServer } from "@/data/mocks/server";
import { publicCatalogueFixture } from "@/data/mocks/public-catalogue";
import { PublicAvailabilityPage } from "./public-availability-page";
import { PublicBookingProvider } from '../components/public-booking-provider';
import type { BookingSearchCriteria } from "../domain/booking-search-criteria";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const criteria = { checkIn: "2026-10-10", checkOut: "2026-10-13", adults: 2, children: 0, roomsCount: 1 };
const fixture = { ...publicCatalogueFixture, check_in_date: criteria.checkIn, check_out_date: criteria.checkOut };
const clients: QueryClient[] = [];
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://pms.test"); vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true");
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); onlineManager.setOnline(true); vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
function mount(initialCriteria: Partial<BookingSearchCriteria> = criteria) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  return render(<QueryClientProvider client={client}><PublicAvailabilityPage initialCriteria={initialCriteria} /></QueryClientProvider>, { wrapper: PublicBookingProvider });
}
function editSearch() { fireEvent.click(screen.getByRole("button", { name: "Modificar búsqueda" })); }
async function deluxe() { return screen.findByRole("article", { name: "Deluxe King" }); }
function cart() { fireEvent.click(screen.getByRole("button", { name: /Mi Selección/ })); return screen.getByRole("dialog", { name: "Mi selección" }); }

describe("Public availability catalogue", () => {
  it("preserves dates, adults, children, rooms and promo from the URL and calculates nights", async () => {
    mount({ ...criteria, adults: 3, children: 1, roomsCount: 2, promoCode: "BOUTIQUE" }); await deluxe();
    expect(screen.getByRole("region", { name: "Tu búsqueda" })).toHaveTextContent("3 adultos · 1 niño");
    expect(screen.getByRole("region", { name: "Tu búsqueda" })).toHaveTextContent("3 noches");
    editSearch();
    expect(screen.getByLabelText(/fecha de llegada/i)).toHaveValue(criteria.checkIn);
    expect(screen.getByLabelText(/fecha de salida/i)).toHaveValue(criteria.checkOut);
    expect(screen.getByLabelText(/^adultos/i)).toHaveValue(3);
    expect(screen.getByLabelText(/^niños/i)).toHaveValue(1);
    expect(screen.getByLabelText(/^habitaciones/i)).toHaveValue(2);
    expect(screen.getByLabelText(/código promocional/i)).toHaveValue("BOUTIQUE");
    expect(screen.getByText(/no incluyen descuentos/)).toBeInTheDocument();
  });
  it("shows loading, ATS, server totals, amenities and a detail link preserving the selected rate", async () => {
    mockServer.use(http.get("*/api/v1/public/availability", async () => { await delay(80); return HttpResponse.json(fixture); }));
    mount(); expect(screen.getByText("Buscando habitaciones…")).toBeInTheDocument();
    const card = await deluxe();
    expect(within(card).getByText("2 habitaciones disponibles para estas fechas")).toBeInTheDocument();
    expect(within(card).getByText(/435\.00/)).toHaveTextContent("3 noches");
    expect(within(card).getByText("Wi-Fi de alta velocidad")).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Ver detalles' })).toHaveAttribute('href', '/habitaciones/rt_deluxe_king?checkIn=2026-10-10&checkOut=2026-10-13&adults=2&children=0&roomsCount=1&ratePlanId=rp_flexible');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Módulos Staff" })).not.toBeInTheDocument();
  });
  it("shows offline state and resumes the same criteria when connectivity returns", async () => {
    onlineManager.setOnline(false); mount();
    expect(screen.getByRole("alert")).toHaveTextContent("Sin conexión"); editSearch();
    expect(screen.getByLabelText(/fecha de llegada/i)).toHaveValue(criteria.checkIn);
    await act(async () => { onlineManager.setOnline(true); }); await deluxe();
  });
  it("does not present ATS zero or room types without rates as available", async () => {
    mockServer.use(http.get("*/api/v1/public/availability", () => HttpResponse.json({ ...fixture,
      available_room_types: fixture.available_room_types.map((room, index) => index === 0 ? { ...room, available_rooms_count: 0 } : { ...room, rate_plans: [] }),
    })));
    mount(); expect(await screen.findByRole("region", { name: "Sin habitaciones disponibles" })).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
  it("keeps criteria after an error and retries successfully", async () => {
    let requests = 0;
    mockServer.use(http.get("*/api/v1/public/availability", () => ++requests === 1 ? new HttpResponse(null, { status: 500 }) : HttpResponse.json(fixture)));
    mount(); expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos consultar disponibilidad");
    editSearch(); expect(screen.getByLabelText(/^habitaciones/i)).toHaveValue(1);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" })); await deluxe(); expect(requests).toBe(2);
  });
  it("shows a connection error without displaying a previous snapshot", async () => {
    mockServer.use(http.get("*/api/v1/public/availability", () => HttpResponse.error()));
    mount(); expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos conectar");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
  it("rejects a response for other dates", async () => {
    mockServer.use(http.get("*/api/v1/public/availability", () => HttpResponse.json(publicCatalogueFixture)));
    mount(); expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos consultar disponibilidad");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
  it("does not query incomplete or malformed criteria", async () => {
    const requests = vi.fn();
    mockServer.use(http.get("*/api/v1/public/availability", () => { requests(); return HttpResponse.json(fixture); }));
    mount({ ...criteria, roomsCount: Number.NaN });
    expect(screen.getByRole("region", { name: "Revisa los criterios de búsqueda" })).toBeInTheDocument();
    await act(async () => {}); expect(requests).not.toHaveBeenCalled();
  });
  it("combines category, capacity and price filters immediately and resets only filters", async () => {
    mount(); await deluxe();
    fireEvent.click(screen.getByLabelText("Suite")); expect(screen.getAllByRole("article")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "4+" })); expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.click(screen.getByLabelText("US$181+"));
    expect(screen.getByRole("region", { name: "Sin habitaciones disponibles" })).toHaveTextContent("No encontramos habitaciones disponibles para las fechas o filtros seleccionados.");
    fireEvent.click(screen.getByRole("button", { name: "Restablecer filtros" }));
    expect(screen.getAllByRole("article")).toHaveLength(4);
    expect(screen.getByRole("region", { name: "Tu búsqueda" })).toHaveTextContent("3 noches");
  });
  it("sorts all results by price and capacity", async () => {
    mount(); await deluxe();
    fireEvent.change(screen.getByLabelText("Ordenar por"), { target: { value: "price-asc" } });
    expect(screen.getAllByRole("article").map(card => card.getAttribute("aria-label"))).toEqual(["Doble Superior", "Deluxe King", "Junior Suite", "Suite Terraza"]);
    fireEvent.change(screen.getByLabelText("Ordenar por"), { target: { value: "price-desc" } });
    expect(screen.getAllByRole("article")[0]).toHaveAccessibleName("Suite Terraza");
    fireEvent.change(screen.getByLabelText("Ordenar por"), { target: { value: "capacity" } });
    expect(screen.getAllByRole("article")[0]).toHaveAccessibleName("Junior Suite");
  });
  it("adds a room, preserves hidden selections, caps quantity at ATS and removes from drawer", async () => {
    mount(); const card = await deluxe(); fireEvent.click(within(card).getByRole("button", { name: "Agregar al carrito" }));
    expect(within(card).getByRole("button", { name: "Seleccionada" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByLabelText("Suite")); const drawer = cart();
    expect(within(drawer).getByText("Deluxe King")).toBeInTheDocument();
    expect(within(drawer).getByText(/435\.00/, { selector: 'strong' })).toBeInTheDocument();
    const increment = within(drawer).getByRole("button", { name: "Aumentar cantidad de Deluxe King" }); fireEvent.click(increment);
    expect(increment).toBeDisabled(); expect(within(drawer).getByText(/870\.00/, { selector: 'strong' })).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "Continuar con el Checkout" })).toBeDisabled();
    expect(within(drawer).getByText('US$ 96.00')).toBeInTheDocument();
    expect(within(drawer).getByText('US$ 1,010.00')).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole("button", { name: "Quitar Deluxe King" }));
    expect(within(drawer).getByText(/Tu selección está vacía/)).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole("button", { name: "Seguir explorando" }));
    expect(screen.getByRole("button", { name: /Mi Selección/ })).toHaveTextContent("(0)");
  });
  it("changes the selected rate without allocating additional physical inventory", async () => {
    mount(); const card = await deluxe(); fireEvent.click(within(card).getByRole("button", { name: "Agregar al carrito" }));
    fireEvent.change(within(card).getByLabelText("Tarifa de Deluxe King"), { target: { value: "rp_non_refundable" } });
    const drawer = cart(); expect(within(drawer).getByText("Tarifa no reembolsable")).toBeInTheDocument();
    expect(within(drawer).getByText(/390\.00/, { selector: 'strong' })).toBeInTheDocument();
    expect(within(drawer).getByText(/1 habitaciones seleccionadas/)).toBeInTheDocument();
  });
  it("modifies a search in place, preserves quantity/promo in URL and discards old quotes", async () => {
    const replace = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    mount({ ...criteria, roomsCount: 2, promoCode: "BOUTIQUE" }); const card = await deluxe();
    fireEvent.click(within(card).getByRole("button", { name: "Agregar al carrito" })); editSearch();
    fireEvent.change(screen.getByLabelText(/^habitaciones/i), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/fecha de salida/i), { target: { value: "2026-10-15" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Buscar Disponibilidad" })); });
    expect(replace).toHaveBeenCalledWith(null, "", "/habitaciones?checkIn=2026-10-10&checkOut=2026-10-15&adults=2&children=0&roomsCount=3&promoCode=BOUTIQUE");
    expect(push).not.toHaveBeenCalled(); await deluxe();
    expect(screen.getByRole("region", { name: "Tu búsqueda" })).toHaveTextContent("5 noches");
    expect(screen.getByRole("button", { name: /Mi Selección/ })).toHaveTextContent("(0)");
    expect(screen.getByRole("status")).toHaveTextContent("Selecciona habitaciones");
  });
  it("uses a new query and clears selection when incoming criteria change", async () => {
    const view = mount(); const card = await deluxe(); fireEvent.click(within(card).getByRole("button", { name: "Agregar al carrito" }));
    view.rerender(<QueryClientProvider client={clients[0]}><PublicAvailabilityPage initialCriteria={{ ...criteria, checkOut: "2026-10-15", roomsCount: 8 }} /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByRole("region", { name: "Sin habitaciones disponibles" })).toBeInTheDocument());
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mi Selección/ })).toHaveTextContent("(0)");
  });
});
