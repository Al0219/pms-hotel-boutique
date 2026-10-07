/** Presentation validation only; the registration API and password policy remain pending BD1. */
export type RegistrationField = 'fullName' | 'email' | 'password' | 'confirmation' | 'terms';
export type RegistrationValues = {
  fullName: string; email: string; password: string; confirmation: string; terms: boolean;
};

export function registrationErrors(values: RegistrationValues): Partial<Record<RegistrationField, string>> {
  const errors: Partial<Record<RegistrationField, string>> = {};
  if (values.fullName.trim().length < 3 || values.fullName.trim().split(/\s+/).length < 2)
    errors.fullName = 'Ingresa tu nombre y apellido.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    errors.email = 'Ingresa un correo electrónico válido.';
  if (values.password.length < 8) errors.password = 'Usa al menos 8 caracteres para tu contraseña.';
  if (!values.confirmation) errors.confirmation = 'Confirma tu contraseña.';
  else if (values.confirmation !== values.password) errors.confirmation = 'Las contraseñas no coinciden.';
  if (!values.terms) errors.terms = 'Acepta los términos y la política de privacidad para continuar.';
  return errors;
}

export function passwordStrength(password: string): { label: string; level: number } {
  if (!password) return { label: 'Usa al menos 8 caracteres', level: 0 };
  if (password.length < 8) return { label: 'Débil', level: 1 };
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^\w\s]/].filter(pattern => pattern.test(password)).length;
  return variety >= 3 && password.length >= 12 ? { label: 'Fuerte', level: 3 } : { label: 'Media', level: 2 };
}
