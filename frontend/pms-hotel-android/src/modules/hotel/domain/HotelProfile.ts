export interface HotelWifi {
  ssid: string;
  password: string;
}

export interface HotelContact {
  phone: string;
  email: string;
}

/** Static frontend/mock profile. It is not a property configuration contract. */
export interface HotelProfile {
  name: string;
  statusLabel: string;
  description: string;
  checkInTime: string;
  checkOutTime: string;
  receptionHours: string;
  wifi: HotelWifi;
  contact: HotelContact;
  address: string;
}
