import { Stack } from "expo-router";

import { QueryProvider } from "@/providers/QueryProvider";
import {
  ActiveReservationContextProvider,
  GuestAuthSessionProvider,
} from "@/modules/guest-auth";
import { GuestRouteGuard } from "@/modules/guest-auth/presentation/GuestRouteGuard";
import { AppClockProvider } from "@/shared/time";

// Metro removes this DEV-only module from production's dependency graph.
const AppClockQaControl = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@/shared/time/AppClockQaControl").AppClockQaControl
  : null;

export default function RootLayout() {
  return (
    <AppClockProvider>
      <QueryProvider>
        <GuestAuthSessionProvider>
          <ActiveReservationContextProvider>
            <GuestRouteGuard>
              <Stack screenOptions={{ headerShown: false }} />
            </GuestRouteGuard>
          </ActiveReservationContextProvider>
        </GuestAuthSessionProvider>
      </QueryProvider>
      {AppClockQaControl ? <AppClockQaControl /> : null}
    </AppClockProvider>
  );
}
