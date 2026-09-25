import { Stack } from 'expo-router';

import { QueryProvider } from '@/providers/QueryProvider';
import { AppClockProvider } from '@/shared/time';

// Metro removes this DEV-only module from production's dependency graph.
const AppClockQaControl = __DEV__
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require('@/shared/time/AppClockQaControl').AppClockQaControl
  : null;

export default function RootLayout() {
  return (
    <AppClockProvider>
      <QueryProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </QueryProvider>
      {AppClockQaControl ? <AppClockQaControl /> : null}
    </AppClockProvider>
  );
}
