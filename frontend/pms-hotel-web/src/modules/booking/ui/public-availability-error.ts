import { HttpNetworkError, HttpStatusError } from '@/lib/http';

export function publicAvailabilityError(error: unknown) {
  if (error instanceof HttpStatusError && error.status === 400) return {
    title: 'Revisa los criterios de búsqueda', message: 'Las fechas o la cantidad de habitaciones no son válidas. Modifica tu búsqueda.',
  };
  if (error instanceof HttpStatusError && error.status === 404) return {
    title: 'Propiedad no disponible', message: 'El hotel no está disponible para consultas públicas. Conservamos tus criterios de búsqueda.',
  };
  return { title: error instanceof HttpNetworkError ? 'No pudimos conectar' : 'No pudimos consultar disponibilidad',
    message: 'Vuelve a intentarlo. Conservamos tus criterios de búsqueda.' };
}
