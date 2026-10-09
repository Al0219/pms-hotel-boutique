import { HttpStatusError } from '@/lib/http';
export function inventoryErrorMessage(error: unknown): string {
  if (error instanceof HttpStatusError) {
    if (error.status === 400) return 'Revisa los campos. El código admite hasta 64 caracteres y el nombre hasta 160.';
    if (error.status === 401) return 'La sesión Staff no está disponible. Inicia sesión nuevamente antes de guardar.';
    if (error.status === 403) return 'Tu sesión no tiene permiso para modificar el inventario de esta propiedad.';
    if (error.status === 404) return 'No se encontró el registro o su tipo en esta propiedad. Actualiza el catálogo.';
    if (error.status === 409) return 'Ese código ya existe en esta propiedad. Usa otro código.';
  }
  return 'No pudimos confirmar el guardado. Conservamos tus datos. Actualiza antes de reintentar.';
}
