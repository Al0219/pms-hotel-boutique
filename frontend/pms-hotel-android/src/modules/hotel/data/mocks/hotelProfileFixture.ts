import { type HotelProfile } from '@/modules/hotel/domain/HotelProfile';

/** Central demo-only content for the standalone Hotel screen. */
export const hotelProfileFixture: HotelProfile = {
  name: 'Hotel Boutique',
  statusLabel: 'Datos de demostración',
  description: 'Una estancia boutique pensada para ofrecer comodidad, atención personalizada y acceso sencillo a los servicios del hotel.',
  checkInTime: '15:00',
  checkOutTime: '12:00',
  receptionHours: '24 horas',
  wifi: { ssid: 'HotelBoutique_Guest', password: 'demo-guest-2026' },
  contact: { phone: '+502 0000-0000', email: 'recepcion@hotel-demo.local' },
  address: 'Dirección de demostración · pendiente de configuración',
};
