import { Stack } from 'expo-router';

import { GuestNavigationMenuProvider, GuestNoticeProvider } from '@/modules/navigation';
import { SessionServiceRequestsProvider } from '@/modules/service-requests';
import { SessionVehiclesProvider } from '@/modules/valet';
import { CheckoutSessionProvider } from '@/modules/checkout/presentation/CheckoutSessionProvider';

export default function GuestLayout() {
  return <GuestNavigationMenuProvider><GuestNoticeProvider><SessionServiceRequestsProvider><CheckoutSessionProvider><SessionVehiclesProvider><Stack screenOptions={{ headerShown: false }} /></SessionVehiclesProvider></CheckoutSessionProvider></SessionServiceRequestsProvider></GuestNoticeProvider></GuestNavigationMenuProvider>;
}
