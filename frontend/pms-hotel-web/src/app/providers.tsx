"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { enableMocking } from "@/data/mocks/enable";
import { getPublicEnvironment } from "@/lib/env";
import { GuestSessionProvider } from "@/modules/auth";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }));
  const [mockState, setMockState] = useState<"loading" | "ready" | "error">(() => getPublicEnvironment().useMockApi ? "loading" : "ready");

  function startMocks() {
    return enableMocking().then(
      () => setMockState("ready"),
      () => setMockState("error"),
    );
  }

  useEffect(() => {
    let mounted = true;
    void enableMocking().then(
      () => { if (mounted) setMockState("ready"); },
      () => { if (mounted) setMockState("error"); },
    );
    return () => { mounted = false; };
  }, []);

  if (mockState === "loading") return <p role="status">Preparando la demostración…</p>;
  if (mockState === "error") return <section>
    <p role="alert">No se pudo preparar la demostración.</p>
    <button type="button" onClick={() => { setMockState("loading"); void startMocks(); }}>Reintentar</button>
  </section>;

  return <QueryClientProvider client={queryClient}><GuestSessionProvider>{children}</GuestSessionProvider></QueryClientProvider>;
}
