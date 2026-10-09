/**
 * Domain Model for Guest Profile
 * Reglas de dominio:
 * - GuestProfile representa la identidad y contacto.
 * - Puede existir SIN una GuestAccount (ej. reservas telefónicas o creadas por staff).
 * - No se fusiona automáticamente con GuestAccount.
 */

export interface GuestProfile {
  profileId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  documentType?: string | null;
  documentId?: string | null;
  nationality?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
