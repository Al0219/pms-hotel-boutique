import { type ValetScreenFixtureDto } from '@/modules/valet/data/dtos/ValetFixtureDto';

/**
 * Local presentation data approved for IMP-AND-0105. These strings are not
 * Backend identifiers, financial values, or operational statuses.
 */
export const valetScreenFixture: ValetScreenFixtureDto = {
  activeVehicleFixtureKey: 'valet-vehicle-primary',
  vehicles: [
    {
      fixtureKey: 'valet-vehicle-primary',
      vehicleDisplayText: 'Toyota Corolla',
      colorText: 'Gris',
      plateText: 'P 123ABC',
      registrationText: 'Placa registrada',
      parkingDetailText: 'Espacio P03 · Llave Valet #14',
      estimatedDeliveryText: '8–12 min',
    },
    {
      fixtureKey: 'valet-vehicle-secondary',
      vehicleDisplayText: 'Mazda CX-5',
      colorText: 'Blanco',
      plateText: 'P 456DEF',
      registrationText: 'Placa registrada',
      parkingDetailText: 'Espacio P12 · Llave Valet #21',
      estimatedDeliveryText: '8–12 min',
    },
  ],
  places: [
    { fixtureKey: 'place-hotel', displayText: 'Hotel', latitude: 14.5987, longitude: -90.5138, type: 'HOTEL' },
    { fixtureKey: 'place-airport', displayText: 'Aeropuerto Internacional La Aurora', latitude: 14.5833, longitude: -90.5275, type: 'PLACE' },
    { fixtureKey: 'place-oakland', displayText: 'Oakland Place', latitude: 14.5965, longitude: -90.5121, type: 'PLACE' },
    { fixtureKey: 'place-centro', displayText: 'Centro Histórico', latitude: 14.6411, longitude: -90.5134, type: 'PLACE' },
    { fixtureKey: 'place-cayala', displayText: 'Ciudad Cayalá', latitude: 14.6094, longitude: -90.4897, type: 'PLACE' },
  ],
  transfer: {
    title: 'Traslado',
    defaultDestinationFixtureKey: 'place-airport',
    defaultDateText: '31 ago',
    defaultTimeText: '08:00',
    defaultPassengers: 2,
  },
  folioNoticeText: 'Los cargos aprobados se agregan automáticamente a tu folio.',
};
