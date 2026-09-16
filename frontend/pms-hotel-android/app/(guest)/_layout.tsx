import { Stack } from 'expo-router';

import { SessionServiceRequestsProvider } from '@/modules/service-requests';
import { SessionVehiclesProvider } from '@/modules/valet';

export default function GuestLayout() {
  return <SessionServiceRequestsProvider><SessionVehiclesProvider><Stack screenOptions={{ headerShown: false }} /></SessionVehiclesProvider></SessionServiceRequestsProvider>;
}
