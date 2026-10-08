export interface ReservationLinkChallenge { id: string; expiresAt: string }
export interface ReservationLinkResult { reservationId: string }
export function referenceError(value: string): string | undefined {
  if (!value.trim()) return 'Ingresa la referencia de tu reserva.';
  if (value.trim().length > 16) return 'La referencia debe tener un máximo de 16 caracteres.';
}
export function otpError(value: string): string | undefined {
  if (!/^[0-9]{8}$/.test(value.trim())) return 'Ingresa el código de 8 dígitos.';
}
