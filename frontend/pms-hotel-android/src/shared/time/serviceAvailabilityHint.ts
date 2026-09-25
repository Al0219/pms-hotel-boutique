export interface ServiceAvailabilityHint {
  accessibilityLabel: string;
  label: string;
}

/** Presentation-only wording for an already-evaluated availability policy. */
export function getServiceAvailabilityHint({
  effectiveCheckoutAtMs,
  noAvailability,
  serviceDate,
}: {
  effectiveCheckoutAtMs: number | null;
  noAvailability: boolean;
  serviceDate: string;
}): ServiceAvailabilityHint {
  if (noAvailability || effectiveCheckoutAtMs === null) {
    return { accessibilityLabel: 'No hay horarios disponibles para esta solicitud.', label: 'No disponible' };
  }

  const checkout = new Date(effectiveCheckoutAtMs);
  const checkoutDate = `${checkout.getFullYear()}-${String(checkout.getMonth() + 1).padStart(2, '0')}-${String(checkout.getDate()).padStart(2, '0')}`;
  if (serviceDate === checkoutDate) {
    const time = `${String(checkout.getHours()).padStart(2, '0')}:${String(checkout.getMinutes()).padStart(2, '0')}`;
    return { accessibilityLabel: `Los horarios respetan el límite efectivo de check-out a las ${time}.`, label: `Hasta ${time}` };
  }
  return { accessibilityLabel: 'La solicitud requiere al menos 30 minutos de anticipación.', label: '30 min mín.' };
}
