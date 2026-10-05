/** Synthetic tokens only. No card number, security code or provider credential. */
export interface DemoCardToken { token: string; holderName: string; brand: 'Visa' | 'Mastercard' | 'Amex'; last4: string }
export const demoCardOptions = [
  { token: 'demo_visa_approved', brand: 'Visa', last4: '4242', label: 'Visa · Aprobación' },
  { token: 'demo_mastercard_approved', brand: 'Mastercard', last4: '4444', label: 'Mastercard · Aprobación' },
  { token: 'demo_amex_approved', brand: 'Amex', last4: '0005', label: 'Amex · Aprobación' },
  { token: 'demo_card_declined', brand: 'Visa', last4: '0002', label: 'Tarjeta rechazada' },
  { token: 'demo_gateway_error', brand: 'Visa', last4: '4242', label: 'Error de pasarela' },
] as const;

export function readDemoCard(value: unknown): DemoCardToken | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !['token', 'holderName', 'brand', 'last4'].includes(key))) return null;
  const option = demoCardOptions.find(item => item.token === input.token && item.brand === input.brand && item.last4 === input.last4);
  if (!option || typeof input.holderName !== 'string' || !input.holderName.trim() || input.holderName.length > 250) return null;
  return { token: option.token, brand: option.brand, last4: option.last4, holderName: input.holderName.trim() };
}
