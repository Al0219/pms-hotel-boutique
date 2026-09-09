"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { enableMocking } from "@/data/mocks/enable";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  }));

  useEffect(() => {
    void enableMocking();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
