/** Frontend-only request. It deliberately contains no Backend or Stay identity. */
export interface RoomServiceRequest {
  items: readonly {
    itemFixtureKey: string;
    quantity: number;
  }[];
  deliveryTime: string;
  serviceDate: string;
  notes?: string;
}
