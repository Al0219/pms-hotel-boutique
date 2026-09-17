import { type Href, router } from 'expo-router';
import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { guestNavigationDrawerLinks } from '@/modules/navigation/GuestNavigationShell';
import { guestNavigationStyles } from '@/modules/navigation/guestNavigationStyles';

type GuestNavigationMenuContextValue = { openMenu: () => void };
const detachedValue: GuestNavigationMenuContextValue = { openMenu: () => undefined };
const GuestNavigationMenuContext = createContext<GuestNavigationMenuContextValue>(detachedValue);

/** Owns the Guest drawer once for the guest route tree. */
export function GuestNavigationMenuProvider({ children }: PropsWithChildren) {
  const [drawerVisible, setDrawerVisible] = useState(false);
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
      <Modal animationType="fade" onRequestClose={closeMenu} transparent visible={drawerVisible}>
        <SafeAreaView style={guestNavigationStyles.drawerModal} testID="guest-navigation-drawer">
          <Pressable accessible={false} onPress={closeMenu} style={guestNavigationStyles.drawerBackdrop}>
            <View style={guestNavigationStyles.drawerBackdropFill} testID="guest-navigation-drawer-backdrop" />
          </Pressable>
          <View accessibilityViewIsModal style={guestNavigationStyles.drawer} testID="guest-navigation-drawer-panel">
            <View style={guestNavigationStyles.drawerHeader}>
              <Text accessibilityRole="header" style={guestNavigationStyles.drawerTitle}>Tu estadía</Text>
              <Pressable accessibilityLabel="Cerrar menú" accessibilityRole="button" onPress={closeMenu} style={guestNavigationStyles.drawerCloseButton} testID="guest-navigation-drawer-close">
                <Text accessible={false} style={guestNavigationStyles.drawerCloseLabel}>×</Text>
              </Pressable>
            </View>
            {guestNavigationDrawerLinks.map((link) => (
              <Pressable accessibilityLabel={link.label} accessibilityRole="button" key={link.path} onPress={() => navigateFromDrawer(link.path)} style={guestNavigationStyles.drawerLink} testID={`guest-navigation-drawer-link-${link.label.toLowerCase().replaceAll(' ', '-')}`}>
                <Text style={guestNavigationStyles.drawerLinkLabel}>{link.label}</Text>
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      </Modal>
    </GuestNavigationMenuContext.Provider>
  );
}

export function useGuestNavigationMenu(): GuestNavigationMenuContextValue {
  return useContext(GuestNavigationMenuContext);
}
