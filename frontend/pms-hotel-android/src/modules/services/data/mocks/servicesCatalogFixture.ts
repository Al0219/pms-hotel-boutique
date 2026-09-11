import { type ServicesCatalogFixtureDto } from '@/modules/services/data/dtos/ServicesFixtureDto';

/** Remote-shaped mock data for the approved Services frames. */
export const servicesCatalogFixture: ServicesCatalogFixtureDto = {
  context: {
    currentStayFixtureKey: 'stay-2026-004281',
    currentPropertyFixtureKey: 'hotel-boutique-guatemala',
  },
  items: [
    {
      fixtureKey: 'late-check-out',
      label: 'Late check-out',
      detailText: 'Hasta las 14:00',
      priceText: 'Q 180',
    },
    {
      fixtureKey: 'breakfast-in-room',
      label: 'Desayuno en habitación',
      detailText: 'Para 2 personas',
      priceText: 'Q 145',
    },
    {
      fixtureKey: 'airport-transfer',
      label: 'Traslado aeropuerto',
      detailText: 'Vehículo privado',
      priceText: 'Q 220',
    },
    {
      fixtureKey: 'special-decoration',
      label: 'Decoración especial',
      detailText: 'Cumpleaños / aniversario',
      priceText: 'Q 320',
    },
  ],
};
