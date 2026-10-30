import { type HotelProfile } from '@/modules/hotel/domain/HotelProfile';

/** Central demo-only content for the standalone Hotel screen. */
export const hotelProfileFixture: HotelProfile = {
  name: 'Hotel Boutique',
  statusLabel: 'Información en configuración',
  description: 'Consulta al equipo del hotel para conocer los servicios disponibles durante tu estadía.',
  checkInTime: 'No disponible',
  checkOutTime: '12:00',
  receptionHours: 'No disponible',
  wifi: { ssid: 'Hotel_Demo', password: 'DemoWifi2026' },
  contact: { phone: '+502 5555 0100', email: 'recepcion@example.test' },
  address: 'Calle Ejemplo 123, Ciudad de Guatemala',
};
