import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { RolesPage } from "@/modules/permissions";
import { PrivacyPage } from "@/modules/privacy";
import { SessionsPage, MfaPage } from "@/modules/security";
import { mockServer } from "@/data/mocks/server";
import { initialPrivacy, initialSecurity, private07Keys } from "@/data/mocks/private-07";

vi.mock("next/navigation", () => ({ usePathname: () => "/seguridad/roles" }));
const clients: QueryClient[] = [];
function mount(page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
  cleanup(); clients.splice(0).forEach(client => client.clear()); vi.restoreAllMocks(); onlineManager.setOnline(true);
});
describe("Private 07 approved mock journeys", () => {
  it("shows offline loading and resumes after reconnection", async () => {
    onlineManager.setOnline(false);
    mount(<PrivacyPage />);
    expect(screen.getByText("Sin conexión. La carga continuará al recuperar la conexión.")).toBeInTheDocument();
    act(() => onlineManager.setOnline(true));
    expect(await screen.findByRole("switch", { name: "Marketing Email" })).toBeChecked();
  });
  it("revokes SMS independently, persists a reload and prevents duplicate DSR requests", async () => {
    const user = userEvent.setup();
    mount(<PrivacyPage />);
    const sms = await screen.findByRole("switch", { name: "Marketing SMS" });
    await user.click(sms);
    await screen.findByText("Consentimiento actualizado y guardado.");
    expect(sms).not.toBeChecked();
    expect(screen.getByRole("switch", { name: "Marketing Email" })).toBeChecked();
    cleanup(); mount(<PrivacyPage />);
    expect(await screen.findByRole("switch", { name: "Marketing SMS" })).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Solicitar exportación" }));
    await screen.findByText("Solicitud simulada registrada como pendiente.");
    expect(screen.getByRole("button", { name: "Solicitar exportación" })).toBeDisabled();
    expect(JSON.parse(localStorage.getItem(private07Keys.privacy)!).requests).toHaveLength(1);
  });
  it("preserves confirmed consent when storage fails and supports retry", async () => {
    const user = userEvent.setup();
    mount(<PrivacyPage />);
    const sms = await screen.findByRole("switch", { name: "Marketing SMS" });
    const storage = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    await user.click(sms);
    await screen.findByRole("alert");
    expect(sms).toBeChecked();
    expect(screen.queryByText("Consentimiento actualizado y guardado.")).not.toBeInTheDocument();
    storage.mockRestore();
    await user.click(screen.getByRole("button", { name: "Reintentar operación" }));
    await screen.findByText("Consentimiento actualizado y guardado.");
    expect(sms).not.toBeChecked();
  });
  it("does not report success while a mutation response is pending", async () => {
    const user = userEvent.setup();
    mockServer.use(http.post("*/__mock/private-07/privacy", async () => {
      await delay(200);
      const data = initialPrivacy(); data.consents[1].active = false;
      return HttpResponse.json(data);
    }));
    mount(<PrivacyPage />);
    const sms = await screen.findByRole("switch", { name: "Marketing SMS" });
    await user.click(sms);
    expect(sms).toBeDisabled(); expect(sms).toBeChecked();
    await screen.findByText("Consentimiento actualizado y guardado.");
    expect(sms).not.toBeChecked();
  });
  it("requires explicit recovery for corrupt local data", async () => {
    const user = userEvent.setup();
    localStorage.setItem(private07Keys.privacy, "{corrupt");
    mount(<PrivacyPage />);
    await screen.findByRole("alert");
    expect(localStorage.getItem(private07Keys.privacy)).toBe("{corrupt");
    await user.click(screen.getByRole("button", { name: "Restablecer esta demostración" }));
    expect(await screen.findByRole("switch", { name: "Marketing Email" })).toBeChecked();
    expect(window.confirm).toHaveBeenCalled();
  });
  it("shows an empty consent state and recovers from network errors", async () => {
    const user = userEvent.setup();
    mockServer.use(http.get("*/__mock/private-07/privacy", () => HttpResponse.error()));
    mount(<PrivacyPage />);
    await screen.findByRole("alert");
    mockServer.use(http.get("*/__mock/private-07/privacy", () => HttpResponse.json({ consents: [], requests: [] })));
    await user.click(screen.getByRole("button", { name: "Reintentar carga" }));
    await screen.findByText("No hay consentimientos registrados.");
  });
  it("edits an unconfigured role, saves on demand, persists and discards a draft", async () => {
    const user = userEvent.setup();
    mount(<RolesPage />);
    await user.click(await screen.findByRole("button", { name: /Recepción.*Sin configuración/ }));
    await user.click(screen.getByRole("switch", { name: "VIEW_RATES" }));
    expect(localStorage.getItem(private07Keys.roles)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));
    await screen.findByText("Cambios guardados en esta demostración.");
    cleanup(); mount(<RolesPage />);
    await user.click(await screen.findByRole("button", { name: /Recepción.*Configurado/ }));
    expect(screen.getByRole("switch", { name: "VIEW_RATES" })).toBeChecked();
    await user.click(screen.getByRole("switch", { name: "VIEW_RATES" }));
    await user.click(screen.getByRole("button", { name: "Descartar cambios" }));
    expect(screen.getByRole("switch", { name: "VIEW_RATES" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "BYPASS_RESTRICTIONS" })).toBeDisabled();
  });
  it("creates empty roles, validates names, duplicates without users and filters the list", async () => {
    const user = userEvent.setup();
    mount(<RolesPage />);
    await user.click(await screen.findByRole("button", { name: "Crear Nuevo Rol" }));
    await user.type(screen.getByLabelText("Nombre del nuevo rol"), "Rol de prueba");
    await user.click(screen.getByRole("button", { name: "Crear rol de ejemplo" }));
    expect(screen.getByRole("switch", { name: "MULTI_PROPERTY_READ" })).not.toBeChecked();
    expect(screen.getByText("Sin propiedades asignadas")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Duplicar Rol" }));
    expect(screen.getByRole("button", { name: /Rol de prueba \(copia\).*0 usuarios/ })).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Nombre del rol"));
    await user.type(screen.getByLabelText("Nombre del rol"), "Gerencia");
    await user.click(screen.getByRole("button", { name: "Guardar Cambios" }));
    await screen.findByText("Cada rol necesita un nombre único y no vacío.");
    expect(localStorage.getItem(private07Keys.roles)).toBeNull();
    await user.type(screen.getByLabelText("Buscar rol"), "no existe");
    expect(screen.getByText("No se encontraron roles.")).toBeInTheDocument();
  });
  it("revokes other sessions, closes current persistently and never changes Guest storage", async () => {
    const user = userEvent.setup();
    localStorage.setItem("guest-test", "independent");
    mount(<SessionsPage />);
    await user.click(await screen.findByRole("button", { name: "Cerrar las demás sesiones" }));
    await screen.findByRole("heading", { name: "Sesiones activas (1)" });
    expect(screen.getByText("Sesión actual")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar sesión actual" }));
    await screen.findByRole("heading", { name: "Sesión de demostración cerrada" });
    cleanup(); mount(<SessionsPage />);
    await screen.findByRole("heading", { name: "Sesión de demostración cerrada" });
    expect(screen.getByText("No hay sesiones activas.")).toBeInTheDocument();
    expect(localStorage.getItem("guest-test")).toBe("independent");
    await user.click(screen.getByRole("button", { name: "Iniciar otra demostración" }));
    await screen.findByRole("heading", { name: "Sesiones activas (1)" });
  });
  it("does not revoke on cancellation or on failed response", async () => {
    const user = userEvent.setup();
    mount(<SessionsPage />);
    const revoke = await screen.findByRole("button", { name: "Cerrar Tablet de ejemplo" });
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    await user.click(revoke);
    expect(screen.getByRole("heading", { name: "Sesiones activas (3)" })).toBeInTheDocument();
    mockServer.use(http.post("*/__mock/private-07/security", () => HttpResponse.json({}, { status: 500 })));
    await user.click(revoke);
    await screen.findByRole("alert");
    expect(screen.getByRole("heading", { name: "Sesiones activas (3)" })).toBeInTheDocument();
  });
  it("configures MFA, cancels enrollment, persists its flag and stores no credential", async () => {
    const user = userEvent.setup();
    mount(<MfaPage />);
    await user.click(await screen.findByRole("button", { name: "Configurar MFA" }));
    await user.click(screen.getByRole("button", { name: "Cancelar configuración" }));
    expect(localStorage.getItem(private07Keys.security)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Configurar MFA" }));
    await user.click(screen.getByRole("button", { name: "Confirmar activación simulada" }));
    await screen.findByText("Estado de MFA guardado en esta demostración.");
    const stored = JSON.parse(localStorage.getItem(private07Keys.security)!);
    expect(Object.keys(stored).sort()).toEqual(["mfa_enabled", "sessions"]);
    expect(stored.mfa_enabled).toBe(true);
    cleanup(); mount(<MfaPage />);
    await user.click(await screen.findByRole("button", { name: "Desactivar MFA" }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(private07Keys.security)!).mfa_enabled).toBe(false));
  });
  it("blocks MFA actions in a closed Staff demo session", async () => {
    const data = initialSecurity(); data.sessions[0].status = "closed";
    localStorage.setItem(private07Keys.security, JSON.stringify(data));
    mount(<MfaPage />);
    await screen.findByText(/La sesión Staff de demostración está cerrada/);
    expect(screen.queryByRole("button", { name: "Configurar MFA" })).not.toBeInTheDocument();
  });
});
