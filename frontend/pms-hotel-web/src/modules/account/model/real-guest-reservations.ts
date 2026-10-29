const reservationLabels: Record<string, string> = { PENDING: 'Pendiente', CONFIRMED: 'Confirmada', CANCELLED: 'Cancelada' };
const stayLabels: Record<string, string> = { RESERVED: 'Reservada', IN_HOUSE: 'En curso', CHECKED_OUT: 'Finalizada', CANCELLED: 'Cancelada', NO_SHOW: 'No presentada' };
export const guestReservationLabel = (status: string) => reservationLabels[status] ?? status;
export const guestStayLabel = (status: string) => stayLabels[status] ?? status;
export const guestDateLabel = (day: string) => new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(day + 'T00:00:00Z'));
export const guestStayNights = (stay: { arrival: string; departure: string }) => Math.round((Date.parse(stay.departure + 'T00:00:00Z') - Date.parse(stay.arrival + 'T00:00:00Z')) / 86400000);
