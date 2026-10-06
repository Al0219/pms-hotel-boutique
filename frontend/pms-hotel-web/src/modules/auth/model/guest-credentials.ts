/** Presentation rules only. Password policy and authentication belong to Backend. */
export type AuthMode = 'login' | 'register';
export type CredentialField = 'fullName' | 'email' | 'password' | 'confirmation' | 'terms';
export type CredentialErrors = Partial<Record<CredentialField, string>>;
export type GuestCredentials = {
  fullName: string;
  email: string;
  password: string;
  confirmation: string;
  terms: boolean;
  marketing: boolean;
};
export type GuestAccessDetails = Pick<GuestCredentials, 'fullName' | 'email' | 'terms' | 'marketing'>;

export function passwordStrength(password: string): { label: string; level: number } {
  if (!password) return { label: 'Usa al menos 8 caracteres', level: 0 };
  if (password.length < 8) return { label: 'Débil', level: 1 };
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^\w\s]/].filter(pattern => pattern.test(password)).length;
  return variety >= 3 && password.length >= 12 ? { label: 'Fuerte', level: 3 } : { label: 'Media', level: 2 };
}

export function validateGuestCredentials(mode: AuthMode, values: GuestCredentials): CredentialErrors {
  const errors: CredentialErrors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Ingresa un correo electrónico válido.';
  if (!values.password) errors.password = 'Ingresa tu contraseña.';
  if (mode === 'register') {
    if (values.fullName.trim().length < 3) errors.fullName = 'Ingresa tu nombre completo (al menos 3 caracteres).';
    else if (values.fullName.trim().split(/\s+/).length < 2) errors.fullName = 'Ingresa tu nombre y apellido.';
    if (values.password.length < 8) errors.password = 'Usa al menos 8 caracteres para tu contraseña.';
    if (!values.confirmation) errors.confirmation = 'Confirma tu contraseña.';
    else if (values.confirmation !== values.password) errors.confirmation = 'Las contraseñas no coinciden.';
    if (!values.terms) errors.terms = 'Acepta los términos y la política de privacidad para continuar.';
  }
  return errors;
}
