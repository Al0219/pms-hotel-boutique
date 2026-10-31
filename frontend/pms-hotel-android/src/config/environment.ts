const useMockApi = process.env.EXPO_PUBLIC_USE_MOCK_API === 'true';
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
export const environment = { apiBaseUrl: apiBaseUrl?.trim() || undefined, useMockApi } as const;

/** HTTP is opt-in for a private, controlled development LAN only. */
export function requireApiBaseUrl(): string {
  if (!environment.apiBaseUrl) throw new Error('Configura EXPO_PUBLIC_API_BASE_URL para usar el Backend real.');
  const url = new URL(environment.apiBaseUrl);
  if (url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) throw new Error('La URL Backend debe ser un origen sin credenciales.');
  const host = url.hostname;
  const local = host === '10.0.2.2' || host === '162.35.114.4' || /^10\.\d+\.\d+\.\d+$/.test(host) || /^192\.168\.\d+\.\d+$/.test(host) || /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host);
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') throw new Error('Usa la IP LAN de Fedora o 10.0.2.2 en el emulador.');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && (host === '162.35.114.4' || (__DEV__ && local && process.env.EXPO_PUBLIC_ALLOW_LOCAL_HTTP === 'true')))) throw new Error('Autenticación requiere HTTPS; HTTP local exige EXPO_PUBLIC_ALLOW_LOCAL_HTTP=true en desarrollo.');
  return url.origin;
}
