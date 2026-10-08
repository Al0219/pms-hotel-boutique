export interface GuestDetails {
  firstName: string;
  lastName: string;
  email: string;
  phoneCode: string;
  phone: string;
  country: string;
  document: string;
  specialRequests: string;
}
export type GuestField = keyof GuestDetails;
export type GuestErrors = Partial<Record<GuestField, string>>;
export const emptyGuest: GuestDetails = { firstName: '', lastName: '', email: '', phoneCode: '+502', phone: '', country: 'GT', document: '', specialRequests: '' };

export const callingCodes = [
  { code: '+502', label: 'Guatemala' }, { code: '+503', label: 'El Salvador' },
  { code: '+504', label: 'Honduras' }, { code: '+505', label: 'Nicaragua' },
  { code: '+506', label: 'Costa Rica' }, { code: '+507', label: 'Panamá' },
  { code: '+52', label: 'México' }, { code: '+1', label: 'EE. UU. / Canadá y Caribe' },
  { code: '+34', label: 'España' }, { code: '+54', label: 'Argentina' },
  { code: '+57', label: 'Colombia' }, { code: '+56', label: 'Chile' },
  { code: '+51', label: 'Perú' }, { code: '+55', label: 'Brasil' },
  { code: '+44', label: 'Reino Unido' }, { code: '+33', label: 'Francia' },
  { code: '+49', label: 'Alemania' },
] as const;

// ISO region codes; labels use the browser's Spanish locale. No geolocation request.
const countryCodes = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
const regionNames = new Intl.DisplayNames(['es'], { type: 'region' });
export const countries = countryCodes.map(code => ({ code, label: regionNames.of(code) ?? code })).sort((a, b) => a.label.localeCompare(b.label, 'es'));

/** Format-only validation. The backend remains responsible for final acceptance. */
export function internationalPhone(guest: Pick<GuestDetails, 'phoneCode' | 'phone'>): string | null {
  if (!/^\+[1-9]\d{0,2}$/.test(guest.phoneCode) || !/^\d+$/.test(guest.phone)) return null;
  const validLength = guest.phoneCode === '+502' ? guest.phone.length === 8 : guest.phone.length >= 7 && guest.phone.length <= 15;
  return validLength ? `${guest.phoneCode}${guest.phone}` : null;
}

export function normalizeGuest(guest: GuestDetails): GuestDetails {
  return { ...guest, firstName: guest.firstName.trim(), lastName: guest.lastName.trim(), email: guest.email.trim().toLowerCase(), document: guest.document.trim() };
}

export function validateGuest(guest: GuestDetails): GuestErrors {
  const errors: GuestErrors = {};
  if (!guest.firstName.trim()) errors.firstName = 'Ingresa tu nombre.';
  else if (!validName(guest.firstName, 50)) errors.firstName = 'Usa entre 2 y 50 caracteres: letras, espacios, apóstrofes o guiones.';
  if (!guest.lastName.trim()) errors.lastName = 'Ingresa tus apellidos.';
  else if (!validName(guest.lastName, 60)) errors.lastName = 'Usa entre 2 y 60 caracteres: letras, espacios, apóstrofes o guiones.';
  if (!guest.email.trim()) errors.email = 'Ingresa tu correo electrónico.';
  else if (guest.email.trim().length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email.trim())) errors.email = 'Ingresa un correo válido, como ejemplo@correo.com.';
  if (!guest.phone.trim()) errors.phone = 'Ingresa tu teléfono.';
  else if (!internationalPhone(guest)) errors.phone = guest.phoneCode === '+502' ? 'Ingresa exactamente 8 dígitos para Guatemala, sin letras ni espacios.' : 'Revisa el código de país e ingresa entre 7 y 15 dígitos, sin letras ni espacios.';
  if (!countries.some(value => value.code === guest.country)) errors.country = 'Selecciona tu país o región.';
  if (!guest.document.trim()) errors.document = 'Ingresa tu documento de identificación.';
  else if (!/^[\p{L}\p{N}-]{4,25}$/u.test(guest.document.trim())) errors.document = 'Usa entre 4 y 25 caracteres: letras, números o guiones.';
  if (guest.specialRequests.length > 250) errors.specialRequests = 'Usa un máximo de 250 caracteres.';
  return errors;
}

function validName(value: string, maximum: number): boolean {
  const name = value.trim();
  return name.length >= 2 && name.length <= maximum && /^[\p{L}\p{M} '\u2019-]+$/u.test(name) && /\p{L}/u.test(name);
}

/** Copy only contact data from an explicitly linked GuestProfile, never GuestAccount. */
export function profileGuestPatch(profile: { firstName: string; lastName: string; email: string; phone: string; country: string }, guest: GuestDetails): Partial<GuestDetails> {
  const patch: Partial<GuestDetails> = {};
  for (const field of ['firstName', 'lastName', 'email'] as const) if (!guest[field].trim()) patch[field] = profile[field];
  if (!guest.phone.trim()) {
    const compact = profile.phone.replace(/[\s().-]/g, '');
    const prefix = [...callingCodes].sort((a, b) => b.code.length - a.code.length).find(value => compact.startsWith(value.code));
    if (prefix && /^\+[1-9]\d{6,14}$/.test(compact)) { patch.phoneCode = prefix.code; patch.phone = compact.slice(prefix.code.length); }
  }
  return patch;
}
