import { type RoomServiceMenu } from '@/modules/services/room-service/domain/models/RoomServiceMenu';

/** FRONTEND MOCK APPROVED FOR IMP-AND-0111. Not a Backend menu contract. */
export const roomServiceMenuFixture: RoomServiceMenu = {
  items: [
    { fixtureKey: 'continental-breakfast', category: 'Desayunos', name: 'Desayuno continental', priceAmount: 75 },
    { fixtureKey: 'typical-breakfast', category: 'Desayunos', name: 'Desayuno típico', priceAmount: 85 },
    { fixtureKey: 'club-sandwich', category: 'Comidas', name: 'Club sándwich', priceAmount: 90 },
    { fixtureKey: 'house-burger', category: 'Comidas', name: 'Hamburguesa de la casa', priceAmount: 95 },
    { fixtureKey: 'coffee', category: 'Bebidas', name: 'Café', priceAmount: 20 },
    { fixtureKey: 'natural-juice', category: 'Bebidas', name: 'Jugo natural', priceAmount: 25 },
  ],
};
