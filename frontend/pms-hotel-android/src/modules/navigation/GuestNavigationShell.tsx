import { type Href, router, usePathname } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, Text, View } from 'react-native';

import {
  getGuestNavigationTabPressHandler,
  guestNavigationTabs,
  isGuestNavigationTabActive,
  type GuestNavigationIcon,
  type GuestNavigationTab,
} from '@/modules/navigation/guestNavigationTabs';
import { guestNavigationStyles } from '@/modules/navigation/guestNavigationStyles';
import { tokens } from '@/shared/theme/tokens';

export interface GuestNavigationDrawerLink {
  icon: GuestNavigationIcon;
  label: string;
  path: string;
}

export interface GuestNavigationDrawerSection {
  id: 'stay' | 'services' | 'hotel';
  label: 'ESTANCIA' | 'SERVICIOS' | 'HOTEL';
  links: readonly GuestNavigationDrawerLink[];
}

export const guestNavigationDrawerSections: readonly GuestNavigationDrawerSection[] = [
  {
    id: 'stay',
    label: 'ESTANCIA',
    links: [
      { icon: { android: 'home', ios: 'house.fill', web: 'home' }, label: 'Inicio', path: '/account' },
      { icon: { android: 'list', ios: 'list.bullet', web: 'list' }, label: 'Mis servicios', path: '/services/requests' },
      { icon: { android: 'star', ios: 'star.fill', web: 'star' }, label: 'Rewards', path: '/account/rewards' },
    ],
  },
  {
    id: 'services',
    label: 'SERVICIOS',
    links: [
      { icon: { android: 'room_service', ios: 'bell.fill', web: 'room_service' }, label: 'Servicios', path: '/services' },
      { icon: { android: 'directions_car', ios: 'car.fill', web: 'directions_car' }, label: 'Valet', path: '/valet' },
    ],
  },
  {
    id: 'hotel',
    label: 'HOTEL',
    links: [{ icon: { android: 'apartment', ios: 'building.2.fill', web: 'apartment' }, label: 'Hotel', path: '/hotel' }],
  },
];

export const guestNavigationDrawerLinks = guestNavigationDrawerSections.flatMap((section) => section.links);

const guestNavigationRootPaths = new Set(['/account', '/services', '/valet', '/hotel']);

/** Guest shell controls are intentionally available only at tab-root routes. */
export function isGuestRootRoute(pathname: string): boolean {
  return guestNavigationRootPaths.has(pathname);
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
            style={({ pressed }) => [guestNavigationStyles.tab, isActive && guestNavigationStyles.tabActive, pressed && guestNavigationStyles.tabPressed]}
            testID={`guest-navigation-tab-${tab.id}`}
          >
            <View accessible={false} testID={`guest-navigation-tab-icon-${tab.id}`}>
              <SymbolView
                accessibilityElementsHidden
                name={tab.icon}
                size={tokens.typography.size.sectionTitle}
                tintColor={isActive ? tokens.color.brand : tokens.color.muted}
              />
            </View>
            <Text accessible={false} style={[guestNavigationStyles.tabLabel, isActive && guestNavigationStyles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface GuestNavigationTabsProps {
  pathname: string;
  tabs?: readonly GuestNavigationTab[];
  onReplace?: (basePath: string) => void;
  onNavigateAway?: (basePath: string) => void;
}

/** Router-integrated entry point for future authorized V3 feature routes. */
export function GuestNavigationShell({ onNavigateAway }: Pick<GuestNavigationTabsProps, 'onNavigateAway'> = {}) {
  const pathname = usePathname();
  const isRootRoute = isGuestRootRoute(pathname);

  function openChat(): void {
    router.push('/chat');
  }

  return (
    <>
      {isRootRoute ? (
        <Pressable accessibilityLabel="Abrir chat" accessibilityRole="button" onPress={openChat} style={guestNavigationStyles.chatFab} testID="guest-navigation-chat-fab">
          <View testID="guest-navigation-chat-fab-icon">
            <SymbolView accessibilityElementsHidden importantForAccessibility="no" name={{ android: 'chat', ios: 'message.fill', web: 'chat' }} size={tokens.layout.controlHeight / 2} style={guestNavigationStyles.chatFabIcon} tintColor={tokens.color.white} />
          </View>
        </Pressable>
      ) : null}
      <GuestNavigationTabs onNavigateAway={onNavigateAway} pathname={pathname} />
    </>
  );
}
