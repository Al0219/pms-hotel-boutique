/** Only the guest-data screen is an allowed checkout return. Never redirect externally. */
export function checkoutReturn(value?: string): string | undefined {
  if (!value || !value.startsWith('/reserva/checkout?') || /[\\\r\n]/.test(value)) return undefined;
  try {
    const url = new URL(value, 'https://pms.invalid');
    return url.origin === 'https://pms.invalid' && url.pathname === '/reserva/checkout' && !url.hash ? `${url.pathname}${url.search}` : undefined;
  } catch { return undefined; }
}

export function guestAccessReturn(value?: string): string | undefined {
  if (value && ['/cuenta', '/mis-reservas', '/cuenta/reservas', '/cuenta/historial', '/cuenta/reservas/vincular'].includes(value)) return value;
  if (value && /^\/cuenta\/reservas\/[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value)) return value;
  return checkoutReturn(value);
}
