import { Stack } from 'expo-router';

import { GuestNoticeProvider } from '@/modules/navigation';
import { SessionServiceRequestsProvider } from '@/modules/service-requests';
import { SessionVehiclesProvider } from '@/modules/valet';

export default function GuestLayout() {
  return <GuestNoticeProvider><SessionServiceRequestsProvider><SessionVehiclesProvider><Stack screenOptions={{ headerShown: false }} /></SessionVehiclesProvider></SessionServiceRequestsProvider></GuestNoticeProvider>;
}
