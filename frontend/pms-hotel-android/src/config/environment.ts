const useMockApi = process.env.EXPO_PUBLIC_USE_MOCK_API === 'true';
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export const environment = {
  apiBaseUrl: apiBaseUrl && apiBaseUrl.length > 0 ? apiBaseUrl : undefined,
  useMockApi,
} as const;
