"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { enableMocking } from "@/data/mocks/enable";
import { getPublicEnvironment } from "@/lib/env";
import { GuestSessionProvider } from "@/modules/auth";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  // Keep SSR and the first browser render identical while mocks are starting.
  const [mockReady, setMockReady] = useState(() => !getPublicEnvironment().useMockApi);
  const [mockError, setMockError] = useState(false);
  const [mockAttempt, setMockAttempt] = useState(0);
  function startMocking() {
    setMockError(false);
    setMockAttempt(attempt => attempt + 1);
  }
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }));
  useEffect(() => {
    if (!getPublicEnvironment().useMockApi) return;

    let mounted = true;
    void enableMocking()
      .then(() => { if (mounted) setMockReady(true); })
      .catch(() => { if (mounted) setMockError(true); });

    return () => {
      mounted = false;
    };
  }, [mockAttempt]);

  return <QueryClientProvider client={queryClient}>{mockReady ? <GuestSessionProvider>{children}</GuestSessionProvider> : mockError
    ? <div role="alert"><p>No se pudo iniciar la demostración.</p><button type="button" onClick={startMocking}>Reintentar inicio</button></div>
    : <p role="status">Preparando demostración…</p>}</QueryClientProvider>;
}
