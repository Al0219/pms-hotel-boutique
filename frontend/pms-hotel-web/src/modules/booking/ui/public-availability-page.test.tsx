import React from "react";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { delay, http, HttpResponse } from "msw";
import { mockServer } from "@/data/mocks/server";
import { mockAvailabilitySuccessDto } from "@/data/mocks/handlers";
import { PublicAvailabilityPage } from "./public-availability-page";
import type { BookingSearchCriteria } from "../domain/booking-search-criteria";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const criteria = { checkIn: "2026-10-10", checkOut: "2026-10-13", adults: 2, children: 0, roomsCount: 1 };
const fixture = { ...mockAvailabilitySuccessDto, check_in_date: criteria.checkIn, check_out_date: criteria.checkOut };
const clients: QueryClient[] = [];
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://pms.test"); vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true");
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); onlineManager.setOnline(true); vi.useRealTimers(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
function mount(initialCriteria: Partial<BookingSearchCriteria> = criteria) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  return render(<QueryClientProvider client={client}><PublicAvailabilityPage initialCriteria={initialCriteria} /></QueryClientProvider>);
}

describe("Public availability results", () => {
  it("shows the paused offline state and resumes the same search when connectivity returns", async () => {
    onlineManager.setOnline(false);
    mount();
    expect(screen.getByRole("alert")).toHaveTextContent("Sin conexión");
    expect(screen.getByLabelText(/fecha de llegada/i)).toHaveValue(criteria.checkIn);
    await act(async () => { onlineManager.setOnline(true); });
    expect(await screen.findByRole("article", { name: "Deluxe King Suite" })).toBeInTheDocument();
  });
  it("shows loading then cards with ATS, totals and expandable policies without a Staff shell", async () => {
    mockServer.use(http.get("*/api/v1/public/availability", async () => { await delay(80); return HttpResponse.json(fixture); }));
    mount();
    expect(screen.getByText("Buscando habitaciones…")).toBeInTheDocument();
    const card = await screen.findByRole("article", { name: "Deluxe King Suite" });
    expect(within(card).getByText("5 habitaciones disponibles para estas fechas")).toBeInTheDocument();
    expect(within(card).getByText(/750,00/)).toBeInTheDocument();
    expect(within(card).getByText(/Cancelación gratuita hasta 48h/)).toBeInTheDocument();
    expect(screen.getByText(/Demostración:/)).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Módulos Staff" })).not.toBeInTheDocument();
  });
  it("does not present ATS zero or a room type without rates as available", async () => {
    mockServer.use(http.get("*/api/v1/public/availability", () => HttpResponse.json({ ...fixture,
      available_room_types: fixture.available_room_types.map((room, index) => index === 0 ? { ...room, available_rooms_count: 0 } : { ...room, rate_plans: [] }),
    })));
    mount();
    expect(await screen.findByRole("region", { name: "Sin habitaciones disponibles" })).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
  it("keeps criteria after an error and retries successfully", async () => {
    let requests = 0;
    mockServer.use(http.get("*/api/v1/public/availability", () => ++requests === 1 ? new HttpResponse(null, { status: 500 }) : HttpResponse.json(fixture)));
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos consultar disponibilidad");
    expect(screen.getByLabelText(/^habitaciones/i)).toHaveValue(1);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("article", { name: "Deluxe King Suite" })).toBeInTheDocument();
    expect(requests).toBe(2);
  });
  it("shows a connection error without displaying a previous snapshot as available", async () => {
    mockServer.use(http.get("*/api/v1/public/availability", () => HttpResponse.error()));
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos conectar");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
  it("rejects a successful response for other dates", async () => {
    mockServer.use(http.get("*/api/v1/public/availability", () => HttpResponse.json(mockAvailabilitySuccessDto)));
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos consultar disponibilidad");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
  it("does not query for incomplete or malformed URL criteria", async () => {
    const requests = vi.fn();
    mockServer.use(http.get("*/api/v1/public/availability", () => { requests(); return HttpResponse.json(fixture); }));
    mount({ ...criteria, roomsCount: Number.NaN });
    expect(screen.getByRole("region", { name: "Revisa los criterios de búsqueda" })).toBeInTheDocument();
    await act(async () => {});
    expect(requests).not.toHaveBeenCalled();
  });
  it("preserves the room quantity and opaque promotion when changing a search", async () => {
    mount({ ...criteria, roomsCount: 2, promoCode: "BOUTIQUE" });
    await screen.findByRole("article", { name: "Deluxe King Suite" });
    expect(screen.getByText(/no incluyen descuentos/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^habitaciones/i), { target: { value: "3" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Buscar Disponibilidad" })); });
    expect(push).toHaveBeenCalledWith("/habitaciones?checkIn=2026-10-10&checkOut=2026-10-13&adults=2&children=0&roomsCount=3&promoCode=BOUTIQUE");
  });
  it("uses a separate query when dates or room demand change", async () => {
    const view = mount();
    await screen.findByRole("article", { name: "Deluxe King Suite" });
    view.rerender(<QueryClientProvider client={clients[0]}><PublicAvailabilityPage initialCriteria={{ ...criteria, checkOut: "2026-10-15", roomsCount: 8 }} /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByRole("region", { name: "Sin habitaciones disponibles" })).toBeInTheDocument());
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
});
