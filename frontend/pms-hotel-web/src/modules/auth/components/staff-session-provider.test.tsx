import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockServer } from "@/data/mocks/server";

import { StaffSessionProvider, useStaffSession } from "./staff-session-provider";

function Probe() {
  const session = useStaffSession();
  return <p>{`${session.userName}|${session.roleId}|${session.memberships[0]?.propertyCode}`}</p>;
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><StaffSessionProvider><Probe /></StaffSessionProvider></QueryClientProvider>);
}

beforeEach(() => { vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false"); });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe("StaffSessionProvider with C2 BFF", () => {
  it("uses the BFF response instead of the Private-09 fixture", async () => {
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
