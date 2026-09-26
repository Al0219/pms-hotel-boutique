import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PrivateLayout from "./layout";
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
const clients: QueryClient[] = [];
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true"); });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); });
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  render(<QueryClientProvider client={client}><PrivateLayout><p>Contenido Staff</p></PrivateLayout></QueryClientProvider>);
}
describe("PrivateLayout", () => {
  it("composes one Staff shell with role-aware navigation and identity", async () => {
    mount();
    const nav = await screen.findByRole("navigation", { name: "Módulos Staff" });
    expect(within(nav).getByRole("link", { name: "Panel" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Multi-property" })).toHaveAttribute("href", "/multi-property");
    expect(within(nav).getByRole("link", { name: "Grupos / Eventos" })).toHaveAttribute("href", "/grupos");
    expect(within(nav).queryByRole("link", { name: "Housekeeping" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByText("Contenido Staff")).toBeInTheDocument();
    expect(screen.getByText("Gerencia · Sesión de demostración")).toBeInTheDocument();
  });
  it("exposes no links to unmounted Staff routes", async () => {
    mount();
    const nav = await screen.findByRole("navigation", { name: "Módulos Staff" });
    expect(within(nav).queryByRole("link", { name: "Folios" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Pagos" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Revenue" })).not.toBeInTheDocument();
  });
});
