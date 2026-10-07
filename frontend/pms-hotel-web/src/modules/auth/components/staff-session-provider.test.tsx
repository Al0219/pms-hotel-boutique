import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { staffSessionKey } from "../hooks/staff-session-query";

import { StaffLogout, StaffSessionProvider, useStaffSession } from "./staff-session-provider";

const navigation = { replace: vi.fn(), push: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), bfcacheId: 'staff-session-test' };
const clients: QueryClient[] = [];

function Probe() {
  const session = useStaffSession();
  return <><p>{`${session.userName}|${session.roleId}|${session.memberships[0]?.propertyCode}`}</p><StaffLogout /></>;
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  return { ...render(<AppRouterContext.Provider value={navigation}><QueryClientProvider client={client}><StaffSessionProvider><Probe /></StaffSessionProvider></QueryClientProvider></AppRouterContext.Provider>), client };
}

beforeEach(() => { vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false"); navigation.replace.mockClear(); });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); });

describe("StaffSessionProvider with C2 BFF", () => {
  it.each([false, true])("uses the BFF response instead of a local identity (mock data=%s)", async useMock => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", String(useMock));
    mockServer.use(http.get("*/api/auth/staff/session", () => HttpResponse.json({
      staffUserId: "staff-1", sessionId: "session-1", username: "gerencia.real", roleCode: "GERENCIA",
      permissions: ["MULTI_PROPERTY_READ"],
      memberships: [{ propertyId: "property-1", propertyCode: "HB-GT-001", name: "Hotel Boutique", timezone: "America/Guatemala", currency: "GTQ" }],
    })));
    mount();
    expect(await screen.findByText("gerencia.real|GERENCIA|HB-GT-001")).toBeInTheDocument();
  });

  it("refreshes an expired access session through the BFF before mounting private content", async () => {
    let sessionCalls = 0;
    mockServer.use(
      http.get("*/api/auth/staff/session", () => {
        sessionCalls += 1;
        return sessionCalls === 1
          ? HttpResponse.json({ error: "Staff session required" }, { status: 401 })
          : HttpResponse.json({
            staffUserId: "staff-1", sessionId: "session-2", username: "gerencia.real", roleCode: "GERENCIA",
            permissions: ["MULTI_PROPERTY_READ"],
            memberships: [{ propertyId: "property-1", propertyCode: "HB-GT-001", name: "Hotel Boutique", timezone: "America/Guatemala", currency: "GTQ" }],
          });
      }),
      http.post("*/api/auth/staff/refresh", () => HttpResponse.json({ refreshed: true })),
    );
    mount();
    expect(await screen.findByText("gerencia.real|GERENCIA|HB-GT-001")).toBeInTheDocument();
    expect(sessionCalls).toBe(2);
  });

  it("does not mount private content when the BFF has no Staff session", async () => {
    mockServer.use(
      http.get("*/api/auth/staff/session", () => HttpResponse.json({ error: "Staff session required" }, { status: 401 })),
      http.post("*/api/auth/staff/refresh", () => HttpResponse.json({ error: "Staff session expired" }, { status: 401 })),
    );
    mount();
    expect(await screen.findByRole("heading", { name: "Sesión Staff requerida" })).toBeInTheDocument();
    expect(screen.queryByText(/\|/)).not.toBeInTheDocument();
  });
});

describe("Staff logout navigation", () => {
  const sessionDTO = {
    staffUserId: "staff-1", sessionId: "session-1", username: "gerencia.real", roleCode: "GERENCIA",
    permissions: ["MULTI_PROPERTY_READ"],
    memberships: [{ propertyId: "property-1", propertyCode: "HB-GT-001", name: "Hotel Boutique", timezone: "America/Guatemala", currency: "GTQ" }],
  };

  it("waits for BFF logout, clears Staff session and redirects home without changing Guest data", async () => {
    let finish!: () => void;
    mockServer.use(
      http.get("*/api/auth/staff/session", () => HttpResponse.json(sessionDTO)),
      http.delete("*/api/auth/staff/session", async () => {
        await new Promise<void>(resolve => { finish = resolve; });
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { client } = mount();
    await screen.findByText("gerencia.real|GERENCIA|HB-GT-001");
    client.setQueryData(["guest-session"], { account: "guest-independent" });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(await screen.findByRole("button", { name: "Cerrando sesión…" })).toBeDisabled();
    expect(navigation.replace).not.toHaveBeenCalled();
    await waitFor(() => expect(finish).toBeDefined());
    finish();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/"));
    expect(client.getQueryData(staffSessionKey)).toBeNull();
    expect(client.getQueryData(["guest-session"])).toEqual({ account: "guest-independent" });
    expect(screen.queryByText("gerencia.real|GERENCIA|HB-GT-001")).not.toBeInTheDocument();
  });

  it.each([false, true])("keeps the panel on logout failure and redirects after retry (mock=%s)", async useMock => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", String(useMock));
    let attempts = 0;
    mockServer.use(
      http.get("*/api/auth/staff/session", () => HttpResponse.json(sessionDTO)),
      http.delete("*/api/auth/staff/session", () => ++attempts === 1 ? new HttpResponse(null, { status: 503 }) : new HttpResponse(null, { status: 204 })),
    );
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Cerrar sesión" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cerrar la sesión");
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/"));
    expect(attempts).toBe(2);
  });

  it("does not mount or restart private content with no BFF session even when data mocks are enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true");
    mockServer.use(
      http.get("*/api/auth/staff/session", () => new HttpResponse(null, { status: 401 })),
      http.post("*/api/auth/staff/refresh", () => new HttpResponse(null, { status: 401 })),
    );
    mount();
    await screen.findByRole("heading", { name: "Sesión Staff requerida" });
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar demostración Staff" })).not.toBeInTheDocument();
  });
});
