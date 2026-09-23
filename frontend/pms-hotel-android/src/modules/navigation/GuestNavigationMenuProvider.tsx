import { type Href, router, usePathname } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { guestNavigationDrawerSections, type GuestNavigationDrawerLink } from '@/modules/navigation/GuestNavigationShell';
import { guestNavigationStyles } from '@/modules/navigation/guestNavigationStyles';
import { tokens } from '@/shared/theme/tokens';

type GuestNavigationMenuContextValue = { openMenu: () => void };
const detachedValue: GuestNavigationMenuContextValue = { openMenu: () => undefined };
const GuestNavigationMenuContext = createContext<GuestNavigationMenuContextValue>(detachedValue);

function drawerLinkTestID(link: GuestNavigationDrawerLink): string {
  return `guest-navigation-drawer-link-${link.label.toLowerCase().replaceAll(' ', '-')}`;
}

function isDrawerLinkActive(link: GuestNavigationDrawerLink, pathname: string): boolean {
  if (pathname.startsWith('/services/requests')) {
    return link.path === '/services/requests';
  }

  return pathname === link.path || pathname.startsWith(`${link.path}/`);
}

/** Owns the Guest drawer once for the guest route tree. */
export function GuestNavigationMenuProvider({ children }: PropsWithChildren) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const pathname = usePathname();
  const openMenu = useCallback(() => setDrawerVisible(true), []);
  const closeMenu = useCallback(() => setDrawerVisible(false), []);
  const navigateFromDrawer = useCallback((path: string) => {
    closeMenu();
    router.replace(path as Href);
  }, [closeMenu]);
  const value = useMemo(() => ({ openMenu }), [openMenu]);

  return (
    <GuestNavigationMenuContext.Provider value={value}>
      {children}
      {drawerVisible ? <Modal animationType="fade" onRequestClose={closeMenu} transparent visible>
        <SafeAreaView edges={['top', 'bottom']} style={guestNavigationStyles.drawerModal} testID="guest-navigation-drawer">
          <Pressable accessible={false} onPress={closeMenu} style={guestNavigationStyles.drawerBackdrop}>
            <View style={guestNavigationStyles.drawerBackdropFill} testID="guest-navigation-drawer-backdrop" />
          </Pressable>
          <View accessibilityViewIsModal style={guestNavigationStyles.drawer} testID="guest-navigation-drawer-panel">
            <View style={guestNavigationStyles.drawerHeader}>
              <View style={guestNavigationStyles.drawerHeaderCopy}>
                <Text accessibilityRole="header" style={guestNavigationStyles.drawerTitle}>Menú</Text>
                <Text style={guestNavigationStyles.drawerSubtitle}>Navega por tu estancia</Text>
              </View>
              <Pressable accessibilityLabel="Cerrar menú" accessibilityRole="button" onPress={closeMenu} style={({ pressed }) => [guestNavigationStyles.drawerCloseButton, pressed && guestNavigationStyles.drawerItemPressed]} testID="guest-navigation-drawer-close">
                <SymbolView accessibilityElementsHidden name={{ android: 'close', ios: 'xmark', web: 'close' }} size={tokens.typography.size.sectionTitle} tintColor={tokens.color.inkStrong} />
              </Pressable>
            </View>
            <View style={guestNavigationStyles.drawerSections}>
              {guestNavigationDrawerSections.map((section) => (
                <View key={section.id} style={guestNavigationStyles.drawerSection}>
                  <Text style={guestNavigationStyles.drawerSectionTitle}>{section.label}</Text>
                  {section.links.map((link) => {
                    const active = isDrawerLinkActive(link, pathname);
                    return (
                      <Pressable
                        accessibilityLabel={link.label}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        key={link.path}
                        onPress={() => navigateFromDrawer(link.path)}
                        style={({ pressed }) => [guestNavigationStyles.drawerLink, active && guestNavigationStyles.drawerLinkActive, pressed && guestNavigationStyles.drawerItemPressed]}
                        testID={drawerLinkTestID(link)}
                      >
                        <SymbolView accessibilityElementsHidden name={link.icon} size={tokens.typography.size.sectionTitle} tintColor={active ? tokens.color.brand : tokens.color.muted} />
                        <Text style={[guestNavigationStyles.drawerLinkLabel, active && guestNavigationStyles.drawerLinkLabelActive]}>{link.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </Modal> : null}
    </GuestNavigationMenuContext.Provider>
  );
}

export function useGuestNavigationMenu(): GuestNavigationMenuContextValue {
  return useContext(GuestNavigationMenuContext);
}
