import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { delay, http, HttpResponse } from "msw";
import { mockServer } from "@/data/mocks/server";
import { AccountDashboardPage } from "@/modules/account";
import { GuestAccessPage } from "./guest-access-page";
import { GuestSessionProvider, useGuestSession } from "./guest-session-provider";
import { GuestAccountGate } from "./guest-account-gate";

const endpoint = "http://pms.test/__mock/guest-access";
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

function SessionObserver() {
  const { status } = useGuestSession();
  return <output aria-label="Guest session">{status}</output>;
}

function setup() {
  vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function Harness({ page }: { page: "access" | "account" | "profile" }) {
    return <QueryClientProvider client={client}><GuestSessionProvider>
      <SessionObserver />
      {page === "access" ? <GuestAccessPage /> : <GuestAccountGate>{page === "account" ? <AccountDashboardPage /> : <p>Perfil del huésped</p>}</GuestAccountGate>}
    </GuestSessionProvider></QueryClientProvider>;
  }
  const view = render(<Harness page="access" />);
  return { client, user: userEvent.setup(), navigate: (page: "access" | "account" | "profile") => view.rerender(<Harness page={page} />) };
}

async function emailAccess(user: ReturnType<typeof userEvent.setup>, email = "demo@example.com") {
  await user.click(screen.getByRole("button", { name: "Continuar con correo" }));
  await user.type(screen.getByLabelText("Correo electrónico"), email);
  await user.click(screen.getByRole("button", { name: "Acceder con correo" }));
}

describe("Guest access and shared session", () => {
  it("signs in through Service/Mapper, retains the session across routes, and clears Guest data on sign-out", async () => {
    const { user, navigate, client } = setup();
    client.setQueryData(["staff", "demo"], { active: true });
    await emailAccess(user);
    expect(screen.getByRole("button", { name: "Accediendo…" })).toBeDisabled();
    expect(screen.getByLabelText("Guest session")).toHaveTextContent("signed-out");
    expect(await screen.findByRole("heading", { name: "Tu cuenta está lista" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a mi cuenta" })).toHaveAttribute("href", "/cuenta");
    navigate("account");
    expect(await screen.findByRole("heading", { name: "Mi cuenta" })).toBeInTheDocument();
    expect(screen.getByText(/Acceso por correo · demo@example.com/)).toBeInTheDocument();
    expect(screen.queryByText(/Google conectado/)).not.toBeInTheDocument();
    navigate("profile");
    expect(screen.getByText("Perfil del huésped")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(screen.queryByText("Perfil del huésped")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/acceso");
    expect(client.getQueriesData({ queryKey: ["guest"] })).toHaveLength(0);
    expect(client.getQueryData(["staff", "demo"])).toEqual({ active: true });
    navigate("access");
    expect(screen.getByRole("heading", { name: "Accede a tu cuenta" })).toBeInTheDocument();
  });

  it("keeps the email after an error, recovers, and never signs in on failure", async () => {
    const { user } = setup();
    await emailAccess(user, "error@example.com");
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos completar el acceso");
    expect(screen.getByLabelText("Guest session")).toHaveTextContent("signed-out");
    const input = screen.getByLabelText("Correo electrónico");
    expect(input).toHaveValue("error@example.com");
    await user.clear(input);
    await user.type(input, "retry@example.com");
    await user.click(screen.getByRole("button", { name: "Acceder con correo" }));
    expect(await screen.findByRole("heading", { name: "Tu cuenta está lista" })).toBeInTheDocument();
  });

  it("reports a network error without false success", async () => {
    const { user } = setup();
    await emailAccess(user, "offline@example.com");
    expect(await screen.findByRole("alert")).toHaveTextContent("Comprueba tu conexión");
    expect(screen.getByLabelText("Guest session")).toHaveTextContent("signed-out");
  });

  it("supports optional Google through the same session authority", async () => {
    const { user, navigate } = setup();
    await user.click(screen.getByRole("button", { name: "Continuar con Google" }));
    await user.click(screen.getByRole("button", { name: "Continuar retorno al PMS" }));
    expect(await screen.findByRole("heading", { name: "Tu cuenta está lista" })).toBeInTheDocument();
    navigate("account");
    expect(await screen.findByText(/Google conectado · guest.google@example.com/)).toBeInTheDocument();
  });

  it("blocks duplicate form submissions while the request is pending", async () => {
    let requests = 0;
    mockServer.use(http.post(endpoint, async () => {
      requests++;
      await delay(100);
      return HttpResponse.json({ account_id: "guest-demo-01", email: "demo@example.com", external_identities: [] });
    }));
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Continuar con correo" }));
    await user.type(screen.getByLabelText("Correo electrónico"), "demo@example.com");
    const form = screen.getByLabelText("Correo electrónico").closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    await screen.findByRole("heading", { name: "Tu cuenta está lista" });
    expect(requests).toBe(1);
  });

  it("guards direct account access and offers a deterministic guest destination", () => {
    const { navigate } = setup();
    expect(screen.getByRole("link", { name: "Continuar como invitado" })).toHaveAttribute("href", "/");
    navigate("account");
    expect(screen.queryByRole("heading", { name: "Mi cuenta" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("does not create a session for malformed account data", async () => {
    mockServer.use(http.post(endpoint, () => HttpResponse.json({ account_id: " ", email: null, external_identities: [] })));
    const { user } = setup();
    await emailAccess(user);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText("Guest session")).toHaveTextContent("signed-out");
  });

  it("validates email and exposes usable keyboard help", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Continuar con correo" }));
    await user.click(screen.getByRole("button", { name: "Acceder con correo" }));
    expect(screen.getByLabelText("Correo electrónico")).toBeInvalid();
    const help = screen.getByRole("button", { name: "¿Problemas para acceder?" });
    help.focus();
    await user.keyboard("{Enter}");
    expect(help).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(screen.getByText(/Revisa el correo e intenta de nuevo/)).toBeInTheDocument());
  });
});
