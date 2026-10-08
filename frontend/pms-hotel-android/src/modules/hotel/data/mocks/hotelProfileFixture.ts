import { type HotelProfile } from '@/modules/hotel/domain/HotelProfile';

/** Central demo-only content for the standalone Hotel screen. */
export const hotelProfileFixture: HotelProfile = {
  name: 'Hotel Boutique',
  statusLabel: 'Información en configuración',
  description: 'Consulta al equipo del hotel para conocer los servicios disponibles durante tu estadía.',
  checkInTime: 'No disponible',
  checkOutTime: '12:00',
  receptionHours: 'No disponible',
  wifi: { ssid: 'No disponible', password: 'No disponible' },
  contact: { phone: 'No disponible', email: 'No disponible' },
  address: 'Ubicación no disponible',
};
