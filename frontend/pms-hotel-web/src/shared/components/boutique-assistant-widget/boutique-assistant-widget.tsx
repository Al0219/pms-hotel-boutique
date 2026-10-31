'use client';

import { usePathname } from 'next/navigation';
import { FaqChatbot } from '../faq-chatbot';
import { WhatsAppButton } from '../whatsapp-button';

export function BoutiqueAssistantWidget() {
  const pathname = usePathname();

  // Si no hay ruta o es ruta de administración / staff / dashboard, no renderizar
  if (
    !pathname ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/staff') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/reservas') ||
    pathname.startsWith('/seguridad') ||
    pathname.startsWith('/housekeeping') ||
    pathname.startsWith('/tarifas') ||
    pathname.startsWith('/folios') ||
    pathname.startsWith('/revenue') ||
    pathname.startsWith('/pagos') ||
    pathname.startsWith('/lista-espera') ||
    pathname.startsWith('/room-service') ||
    pathname.startsWith('/multi-property') ||
    pathname.startsWith('/calendario') ||
    pathname.startsWith('/disponibilidad') ||
    pathname.startsWith('/reportes') ||
    pathname.startsWith('/mensajeria') ||
    pathname.startsWith('/amenities') ||
    pathname.startsWith('/parking-valet') ||
    pathname.startsWith('/mantenimiento') ||
    pathname.startsWith('/grupos') ||
    pathname.startsWith('/inventario') ||
    pathname.startsWith('/conserjeria') ||
    pathname.startsWith('/empresas') ||
    pathname.startsWith('/integraciones') ||
    pathname.startsWith('/activar-staff')
  ) {
    return null;
  }

  // Únicamente mostrar en landing page (/) y rutas públicas de reserva
  const isPublicBookingRoute =
    pathname === '/' ||
    pathname.startsWith('/habitaciones') ||
    pathname.startsWith('/reserva') ||
    pathname.startsWith('/mis-reservas') ||
    pathname.startsWith('/cuenta') ||
    pathname.startsWith('/acceso');

  if (!isPublicBookingRoute) {
    return null;
  }

  return (
    <div
      className="fixed bottom-28 right-6 z-[99999] flex flex-col items-end gap-3 pointer-events-auto"
      style={{
        position: 'fixed',
        bottom: '7rem',
        right: '1.5rem',
        zIndex: 99999,
      }}
      aria-label="Atención al cliente y mensajería"
    >
      <FaqChatbot />
      <WhatsAppButton />
    </div>
  );
}
