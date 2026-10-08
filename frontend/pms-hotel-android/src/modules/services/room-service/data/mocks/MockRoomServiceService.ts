import { roomServiceMenuFixture } from '@/modules/services/room-service/data/mocks/roomServiceMenuFixture';
import { type RoomServiceService } from '@/modules/services/room-service/data/services/RoomServiceService';

export interface MockRoomServiceServiceOptions {
  getMenu?: RoomServiceService['getMenu'];
  submitRequest?: RoomServiceService['submitRequest'];
}

/** Replaceable frontend mock. It neither persists nor creates an order entity. */
export class MockRoomServiceService implements RoomServiceService {
  private readonly getMenuMock: RoomServiceService['getMenu'];
  private readonly submitRequestMock: RoomServiceService['submitRequest'];

  public constructor(options: MockRoomServiceServiceOptions = {}) {
    this.getMenuMock = options.getMenu ?? (async () => roomServiceMenuFixture);
    this.submitRequestMock = options.submitRequest ?? (async () => undefined);
  }

  public getMenu() {
    return this.getMenuMock();
  }

  public submitRequest(...args: Parameters<RoomServiceService['submitRequest']>) {
    return this.submitRequestMock(...args);
  }
}
