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
  const [mockReady, setMockReady] = useState(() => {
    // In SSR or when mock API is disabled, render immediately
    if (typeof window === "undefined" || !getPublicEnvironment().useMockApi) {
      return true;
    }
    return false;
  });

  useEffect(() => {
    let mounted = true;
    async function init() {
      if (getPublicEnvironment().useMockApi) {
        await enableMocking();
      }
      if (mounted) {
        setMockReady(true);
      }
    }
    void init();

    return () => {
      mounted = false;
    };
  }, []);

  if (!mockReady) {
    return null;
  }

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
