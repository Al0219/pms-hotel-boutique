"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { enableMocking } from "@/data/mocks/enable";
import { getPublicEnvironment } from "@/lib/env";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  const [mockReady, setMockReady] = useState(() => !getPublicEnvironment().useMockApi);
  const [mockError, setMockError] = useState(false);
  function startMocking() {
    setMockError(false);
    void enableMocking().then(() => setMockReady(true)).catch(() => setMockError(true));
  }
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  }));

  useEffect(() => {
    void enableMocking().then(() => setMockReady(true)).catch(() => setMockError(true));
  }, []);

  return <QueryClientProvider client={queryClient}>{mockReady ? children : mockError
    ? <div role="alert"><p>No se pudo iniciar la demostración.</p><button type="button" onClick={startMocking}>Reintentar inicio</button></div>
    : <p role="status">Preparando demostración…</p>}</QueryClientProvider>;
}
