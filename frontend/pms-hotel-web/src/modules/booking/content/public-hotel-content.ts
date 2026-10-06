type SocialProfile = { name: string; icon: 'facebook' | 'x' | 'instagram'; url: string | null };

/** Editable editorial demo content. Replace with the hotel's approved content before publication. */
export const publicHotelContent = {
  name: 'Hotel Boutique',
  description: 'Hospitalidad cercana, espacios con carácter y pequeños detalles que hacen especial cada estadía.',
  locale: 'ES',
  copyrightYear: 2026,
  contact: {
    address: 'Av. Las Magnolias #123, Zona Rosa',
    phone: '+1 (202) 555-0147',
    email: 'reservas@hotelboutique.example',
  },
  socialIntroduction: 'Inspírate y descubre las novedades de nuestra experiencia boutique.',
  // No fictional profile URL is published as an official hotel account.
  socialProfiles: [
    { name: 'Facebook', icon: 'facebook', url: null },
    { name: 'X (Twitter)', icon: 'x', url: null },
    { name: 'Instagram', icon: 'instagram', url: null },
  ] as readonly SocialProfile[],
} as const;

export const publicHotelInformation = {
  gallery: { title: 'Galería', text: 'Explora las fotografías de nuestras habitaciones y descubre los espacios que acompañarán tu próxima estadía.' },
  offers: { title: 'Ofertas especiales', text: 'Consulta tus fechas para conocer las tarifas disponibles. Los códigos promocionales requieren validación antes de confirmar una reserva.' },
  faq: { title: 'Preguntas frecuentes', text: 'Puedes buscar disponibilidad sin iniciar sesión. Para consultar tus reservas necesitas acceder a tu cuenta. Las tarifas y condiciones se muestran en los resultados para las fechas seleccionadas.' },
  privacy: { title: 'Política de privacidad', text: 'La política de privacidad del hotel está pendiente de publicación. Solicita al hotel información sobre el tratamiento de tus datos antes de enviar información personal.' },
  terms: { title: 'Términos y condiciones', text: 'Los términos y condiciones del hotel están pendientes de publicación. Consulta las condiciones de la tarifa antes de confirmar tu reserva.' },
  cookies: { title: 'Política de cookies', text: 'La información sobre cookies del hotel está pendiente de publicación. Las funciones de acceso a la cuenta utilizan cookies de sesión.' },
} as const;
