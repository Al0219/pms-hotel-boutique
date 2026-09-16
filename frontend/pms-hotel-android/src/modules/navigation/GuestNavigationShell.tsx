import { type Href, router, usePathname } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import {
  getGuestNavigationTabPressHandler,
  guestNavigationTabs,
  isGuestNavigationTabActive,
  type GuestNavigationTab,
} from '@/modules/navigation/guestNavigationTabs';
import { guestNavigationStyles } from '@/modules/navigation/guestNavigationStyles';

export interface GuestNavigationTabsProps {
  pathname: string;
  tabs?: readonly GuestNavigationTab[];
  onReplace?: (basePath: string) => void;
  onNavigateAway?: (basePath: string) => void;
}

function replaceGuestRoute(basePath: string): void {
  router.replace(basePath as Href);
}

/** Presentation-only V3 Guest footbar. It does not mount routes or feature UI. */
export function GuestNavigationTabs({
  pathname,
  tabs = guestNavigationTabs,
  onReplace = replaceGuestRoute,
  onNavigateAway,
}: GuestNavigationTabsProps) {
  return (
    <View accessibilityLabel="Navegación principal de huésped" accessibilityRole="tablist" style={guestNavigationStyles.shell}>
      {tabs.map((tab) => {
        const isActive = isGuestNavigationTabActive(tab, pathname);
        const onPress = getGuestNavigationTabPressHandler(tab, pathname, onNavigateAway ?? onReplace);

        return (
          <Pressable
            accessibilityHint={tab.disabled ? 'No disponible todavía.' : undefined}
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ disabled: tab.disabled, selected: isActive }}
            disabled={tab.disabled}
            key={tab.id}
            onPress={onPress}
            style={[guestNavigationStyles.tab, isActive && guestNavigationStyles.tabActive]}
            testID={`guest-navigation-tab-${tab.id}`}
          >
            <Text accessible={false} style={[guestNavigationStyles.tabLabel, isActive && guestNavigationStyles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Router-integrated entry point for future authorized V3 feature routes. */
export function GuestNavigationShell({ onNavigateAway }: Pick<GuestNavigationTabsProps, 'onNavigateAway'> = {}) {
  return <GuestNavigationTabs onNavigateAway={onNavigateAway} pathname={usePathname()} />;
}
