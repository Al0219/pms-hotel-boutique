import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { mockServer } from "@/data/mocks/server";
import { setAuthToken } from "@/lib/http/interceptors";
import { GuestAccountGate } from "./guest-account-gate";
import { GuestAccessPage } from "./guest-access-page";
import { GuestSessionProvider, useGuestSession } from "./guest-session-provider";

const endpoint = "*/api/auth/guest/session";
const dto = { guestAccountId: "guest-real", sessionId: "session-real", email: "guest@example.test", context: "GUEST" };

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false"));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); setAuthToken(null); });

function Observer() {
  const { account, status, signIn } = useGuestSession();
  return <>
    <output aria-label="Guest session">{JSON.stringify({ account, status })}</output>
    <button onClick={() => void signIn({ method: "GOOGLE" })}>Simular acceso</button>
  </>;
}

function setup(page: "account" | "access" = "account") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function Harness({ page }: { page: "account" | "access" }) {
    return <QueryClientProvider client={client}><GuestSessionProvider><Observer />
      {page === "access" ? <GuestAccessPage /> : <GuestAccountGate><h1>Cuenta autenticada</h1></GuestAccountGate>}
    </GuestSessionProvider></QueryClientProvider>;
  }
  const view = render(<Harness page={page} />);
  return { client, user: userEvent.setup(), navigate: (page: "account" | "access") => view.rerender(<Harness page={page} />) };
}

describe("Guest session through the real BFF", () => {
  it("hydrates 200 on mount after the Google callback, without an extra action", async () => {
    const requests: Request[] = [];
    setAuthToken("synthetic-staff-token");
    mockServer.use(http.get(endpoint, ({ request }) => { requests.push(request); return HttpResponse.json(dto); }));
    const { navigate } = setup();
    expect(await screen.findByRole("heading", { name: "Cuenta autenticada" })).toBeInTheDocument();
    expect(screen.getByLabelText("Guest session")).toHaveTextContent('"status":"signed-in"');
    expect(screen.getByText(dto.email)).toBeInTheDocument();
    expect(requests).toHaveLength(1);
    expect(new URL(requests[0].url).origin).toBe(window.location.origin);
    expect(requests[0].headers.has("authorization")).toBe(false);
    navigate("access");
    expect(screen.getByRole("heading", { name: "Tu cuenta está lista" })).toBeInTheDocument();
    expect(screen.getByText(/Tu sesión está iniciada/)).toBeInTheDocument();
    expect(screen.queryByText(/demostración está iniciada|Correo electrónico/)).not.toBeInTheDocument();
    navigate("account");
    expect(screen.getByRole("heading", { name: "Cuenta autenticada" })).toBeInTheDocument();
    expect(requests).toHaveLength(1);
  });

  it("treats only 401 as signed-out", async () => {
    mockServer.use(http.get(endpoint, () => new HttpResponse(null, { status: 401 })));
    setup();
    expect(await screen.findByRole("heading", { name: "Accede a tu cuenta" })).toBeInTheDocument();
    expect(screen.getByLabelText("Guest session")).toHaveTextContent('"status":"signed-out"');
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each(["account", "access"] as const)("shows checking without a signed-out flash on %s", async page => {
    let finish!: () => void;
    mockServer.use(http.get(endpoint, async () => {
      await new Promise<void>(resolve => { finish = resolve; });
      return HttpResponse.json(dto);
    }));
    setup(page);
    expect(screen.getByText("Comprobando tu sesión…")).toHaveAttribute("role", "status");
    expect(screen.queryByRole("heading", { name: "Accede a tu cuenta" })).not.toBeInTheDocument();
    await waitFor(() => expect(finish).toBeDefined());
    await act(async () => finish());
    expect(await screen.findByRole("heading", { name: page === "account" ? "Cuenta autenticada" : "Tu cuenta está lista" })).toBeInTheDocument();
  });

  it("server rendering also starts in checking, without reading browser cookies", () => {
    const client = new QueryClient();
    const html = renderToString(<QueryClientProvider client={client}><GuestSessionProvider><GuestAccountGate><p>Private</p></GuestAccountGate></GuestSessionProvider></QueryClientProvider>);
    expect(html).toContain("Comprobando tu sesión");
    expect(html).not.toContain("Accede a tu cuenta");
  });

  it.each(["503", "network"])("preserves unknown session on %s and allows retry", async failure => {
    let attempts = 0;
    mockServer.use(http.get(endpoint, () => {
      if (++attempts > 1) return HttpResponse.json(dto);
      return failure === "503" ? HttpResponse.json({ error: "Unavailable" }, { status: 503 }) : HttpResponse.error();
    }));
    const { user } = setup();
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos comprobar tu sesión");
    expect(screen.getByLabelText("Guest session")).toHaveTextContent('"status":"error"');
    expect(screen.queryByRole("heading", { name: "Accede a tu cuenta" })).not.toBeInTheDocument();
    expect(attempts).toBe(1);
    await user.click(screen.getByRole("button", { name: "Reintentar sesión" }));
    expect(await screen.findByRole("heading", { name: "Cuenta autenticada" })).toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it("rejects malformed/context-Staff sessions without false authentication", async () => {
    mockServer.use(http.get(endpoint, () => HttpResponse.json({ ...dto, context: "STAFF" })));
    setup();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Cuenta autenticada" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Guest session")).toHaveTextContent('"account":null');
  });

  it("does not copy tokens or fabricate external identities in client state/cache", async () => {
    mockServer.use(http.get(endpoint, () => HttpResponse.json({ ...dto, accessToken: "synthetic-access", refreshToken: "synthetic-refresh", externalIdentities: [{ provider: "GOOGLE" }] })));
    const { client } = setup();
    await screen.findByRole("heading", { name: "Cuenta autenticada" });
    const state = JSON.parse(screen.getByLabelText("Guest session").textContent!);
    expect(state.account).toEqual({ id: dto.guestAccountId, email: dto.email });
    expect(client.getQueryData(["guest-session"])).toEqual({ id: dto.sessionId, context: "GUEST", account: state.account });
    expect(JSON.stringify(client.getQueryData(["guest-session"]))).not.toMatch(/Token|synthetic-|externalIdentities/);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("awaits BFF DELETE before clearing Guest state/data and preserves Staff queries", async () => {
    let finish!: () => void;
    const deletes: Request[] = [];
    mockServer.use(http.get(endpoint, () => HttpResponse.json(dto)), http.delete(endpoint, async ({ request }) => {
      deletes.push(request);
      await new Promise<void>(resolve => { finish = resolve; });
      return new HttpResponse(null, { status: 204 });
    }));
    const { client, user } = setup();
    await screen.findByRole("heading", { name: "Cuenta autenticada" });
    client.setQueryData(["guest", "profile"], { name: "Disposable" });
    client.setQueryData(["staff", "profile"], { name: "Staff" });
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(screen.getByRole("button", { name: "Cerrando sesión…" })).toBeDisabled();
    expect(screen.getByRole("heading", { name: "Cuenta autenticada" })).toBeInTheDocument();
    expect(client.getQueryData(["guest", "profile"])).toBeDefined();
    await waitFor(() => expect(finish).toBeDefined());
    await act(async () => finish());
    expect(await screen.findByRole("heading", { name: "Accede a tu cuenta" })).toBeInTheDocument();
    expect(deletes).toHaveLength(1);
    expect(deletes[0].method).toBe("DELETE");
    expect(deletes[0].headers.has("authorization")).toBe(false);
    expect(client.getQueriesData({ queryKey: ["guest"] })).toHaveLength(0);
    expect(client.getQueryData(["guest-session"])).toBeNull();
    expect(client.getQueryData(["staff", "profile"])).toEqual({ name: "Staff" });
  });

  it("keeps account/cache on logout failure and allows retry", async () => {
    let attempts = 0;
    mockServer.use(http.get(endpoint, () => HttpResponse.json(dto)), http.delete(endpoint, () => ++attempts === 1
      ? new HttpResponse(null, { status: 503 }) : new HttpResponse(null, { status: 204 })));
    const { client, user } = setup();
    await screen.findByRole("heading", { name: "Cuenta autenticada" });
    client.setQueryData(["guest", "profile"], { name: "Disposable" });
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cerrar la sesión");
    expect(screen.getByRole("heading", { name: "Cuenta autenticada" })).toBeInTheDocument();
    expect(client.getQueryData(["guest", "profile"])).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(await screen.findByRole("heading", { name: "Accede a tu cuenta" })).toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it("uses the Google BFF link in real mode and never offers mock email/Apple access", async () => {
    mockServer.use(http.get(endpoint, () => new HttpResponse(null, { status: 401 })));
    const { user } = setup("access");
    const google = await screen.findByRole("link", { name: "Continuar con Google" });
    expect(google).toHaveAttribute("href", "/api/auth/guest/google");
    expect(screen.queryByRole("button", { name: "Continuar con correo" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Apple/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Simular acceso" }));
    expect(screen.getByLabelText("Guest session")).toHaveTextContent('"status":"signed-out"');
  });

  it("does not call the real session BFF in mock mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true");
    const bff = vi.fn(() => new HttpResponse(null, { status: 401 }));
    mockServer.use(http.get(endpoint, bff), http.delete(endpoint, bff));
    const { user } = setup("access");
    await user.click(screen.getByRole("button", { name: "Continuar con Google" }));
    await user.click(screen.getByRole("button", { name: "Continuar retorno al PMS" }));
    expect(await screen.findByRole("heading", { name: "Tu cuenta está lista" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(screen.getByLabelText("Guest session")).toHaveTextContent('"status":"signed-out"');
    expect(bff).not.toHaveBeenCalled();
  });
});
