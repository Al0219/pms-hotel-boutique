"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { enableMocking } from "@/data/mocks/enable";
import { getPublicEnvironment } from "@/lib/env";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  }));
  const [mocksReady, setMocksReady] = useState(() => !getPublicEnvironment().useMockApi);

  useEffect(() => {
    if (mocksReady) {
      return;
    }

    let active = true;

    void enableMocking().then(() => {
      if (active) {
        setMocksReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, [mocksReady]);

  if (!mocksReady) {
    return null;
  }

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
