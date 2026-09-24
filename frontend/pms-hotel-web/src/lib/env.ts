export interface PublicEnvironment {
  apiBaseUrl: string | undefined;
  useMockApi: boolean;
}

export function getPublicEnvironment(environment: NodeJS.ProcessEnv = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_USE_MOCK_API: process.env.NEXT_PUBLIC_USE_MOCK_API,
}): PublicEnvironment {
  const apiBaseUrl = environment.NEXT_PUBLIC_API_BASE_URL?.trim();
  const useMockApi = environment.NEXT_PUBLIC_USE_MOCK_API === "true";

  return {
    apiBaseUrl: apiBaseUrl || undefined,
    useMockApi,
  };
}
