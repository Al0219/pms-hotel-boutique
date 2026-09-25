import { type RoomServiceMenu } from '@/modules/services/room-service/domain/models/RoomServiceMenu';

/** FRONTEND MOCK APPROVED FOR IMP-AND-0111. Not a Backend menu contract. */
export const roomServiceMenuFixture: RoomServiceMenu = {
  items: [
    { fixtureKey: 'continental-breakfast', periods: ['BREAKFAST'], name: 'Desayuno continental', priceAmount: 75 },
    { fixtureKey: 'typical-breakfast', periods: ['BREAKFAST'], name: 'Desayuno típico', priceAmount: 85 },
    { fixtureKey: 'club-sandwich', periods: ['LUNCH', 'DINNER'], name: 'Club sándwich', priceAmount: 90 },
    { fixtureKey: 'house-burger', periods: ['LUNCH', 'DINNER'], name: 'Hamburguesa de la casa', priceAmount: 95 },
    { fixtureKey: 'coffee', periods: ['BEVERAGES'], name: 'Café', priceAmount: 20 },
    { fixtureKey: 'natural-juice', periods: ['BEVERAGES'], name: 'Jugo natural', priceAmount: 25 },
  ],
};
