/** Only the guest-data screen is an allowed checkout return. Never redirect externally. */
export function checkoutReturn(value?: string): string | undefined {
  if (!value || !value.startsWith('/reserva/checkout?') || /[\\\r\n]/.test(value)) return undefined;
  try {
    const url = new URL(value, 'https://pms.invalid');
    return url.origin === 'https://pms.invalid' && url.pathname === '/reserva/checkout' && !url.hash ? `${url.pathname}${url.search}` : undefined;
  } catch { return undefined; }
}
