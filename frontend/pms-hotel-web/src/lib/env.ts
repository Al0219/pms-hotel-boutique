export interface PublicEnvironment {
  apiBaseUrl: string | undefined;
  useMockApi: boolean;
}

export function getPublicEnvironment(): PublicEnvironment {
  // Next.js only embeds public variables accessed directly through process.env.
  // Aliasing the environment object works in Node but leaves browser values undefined.
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

  return {
    apiBaseUrl: apiBaseUrl || undefined,
    useMockApi,
  };
}
