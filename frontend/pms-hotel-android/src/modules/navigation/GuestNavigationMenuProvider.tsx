import { type Href, router, usePathname } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { guestNavigationDrawerSections, type GuestNavigationDrawerLink, type GuestNavigationDrawerSection } from '@/modules/navigation/GuestNavigationShell';
import { useCheckoutStatus } from '@/modules/checkout';
import { guestNavigationStyles } from '@/modules/navigation/guestNavigationStyles';
import { tokens } from '@/shared/theme/tokens';
import { ConfirmationModal } from '@/shared/components';

export interface GuestNavigationGuard {
  isDirty: boolean;
  message: string;
  onDiscard?: () => void;
  title: string;
}
type GuestNavigationMenuContextValue = {
  openMenu: () => void;
  registerNavigationGuard: (guard: GuestNavigationGuard) => () => void;
  requestGuestNavigation: (path: string) => void;
};
const detachedValue: GuestNavigationMenuContextValue = {
  openMenu: () => undefined,
  registerNavigationGuard: () => () => undefined,
  requestGuestNavigation: () => undefined,
};
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

function DrawerLink({ link, onPress, pathname, snapshotAvailable }: { link: GuestNavigationDrawerLink; onPress: (path: string) => void; pathname: string; snapshotAvailable: boolean }) {
  const active = isDrawerLinkActive(link, pathname);
  const disabled = Boolean(link.requiresCheckoutSnapshot && !snapshotAvailable);

  return (
    <Pressable
      accessibilityHint={disabled ? 'Disponible después del check-out.' : undefined}
      accessibilityLabel={link.label}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={() => onPress(link.path)}
      style={({ pressed }) => [guestNavigationStyles.drawerLink, active && guestNavigationStyles.drawerLinkActive, pressed && guestNavigationStyles.drawerItemPressed]}
      testID={drawerLinkTestID(link)}
    >
      <SymbolView accessibilityElementsHidden name={link.icon} size={tokens.typography.size.sectionTitle} tintColor={active ? tokens.color.brand : tokens.color.muted} />
      <Text style={[guestNavigationStyles.drawerLinkLabel, active && guestNavigationStyles.drawerLinkLabelActive]}>{link.label}</Text>
    </Pressable>
  );
}

/** Owns the Guest drawer once for the guest route tree. */
export function GuestNavigationMenuProvider({ children }: PropsWithChildren) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [expandedSection, setExpandedSection] = useState<GuestNavigationDrawerSection['id'] | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<{ guard: GuestNavigationGuard; path: string } | null>(null);
  const guardRef = useRef<GuestNavigationGuard | null>(null);
  const pathname = usePathname();
  const { isCheckedOut } = useCheckoutStatus();
  const openMenu = useCallback(() => {
    setExpandedSection(guestNavigationDrawerSections.find((section) => section.links.some((link) => isDrawerLinkActive(link, pathname)))?.id ?? null);
    setDrawerVisible(true);
  }, [pathname]);
  const closeMenu = useCallback(() => setDrawerVisible(false), []);
  /** Shared navigation intent so dirty feature screens never need to know the drawer implementation. */
  const requestGuestNavigation = useCallback((path: string) => {
    if (path === pathname) {
      closeMenu();
      return;
    }
    if (guardRef.current?.isDirty) {
      setPendingNavigation({ guard: guardRef.current, path });
      return;
    }
    closeMenu();
    router.replace(path as Href);
  }, [closeMenu, pathname]);
  const registerNavigationGuard = useCallback((guard: GuestNavigationGuard) => {
    guardRef.current = guard;
    return () => {
      if (guardRef.current === guard) guardRef.current = null;
    };
  }, []);
  const discardAndNavigate = useCallback(() => {
    const navigation = pendingNavigation;
    setPendingNavigation(null);
    navigation?.guard.onDiscard?.();
    closeMenu();
    if (navigation) router.replace(navigation.path as Href);
  }, [closeMenu, pendingNavigation]);
  const value = useMemo(
    () => ({ openMenu, registerNavigationGuard, requestGuestNavigation }),
    [openMenu, registerNavigationGuard, requestGuestNavigation],
  );

  return (
    <GuestNavigationMenuContext.Provider value={value}>
      {children}
      {drawerVisible ? <Modal animationType="fade" onRequestClose={closeMenu} transparent visible>
        <SafeAreaView edges={['top', 'bottom']} style={guestNavigationStyles.drawerModal} testID="guest-navigation-drawer">
          <Pressable accessibilityLabel="Cerrar menú" accessibilityRole="button" onPress={closeMenu} style={guestNavigationStyles.drawerBackdrop} testID="guest-navigation-drawer-backdrop">
            <View style={guestNavigationStyles.drawerBackdropFill} />
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
                  <Pressable accessibilityRole="button" accessibilityState={{ expanded: expandedSection === section.id }} onPress={() => setExpandedSection((current) => current === section.id ? null : section.id)} style={guestNavigationStyles.drawerSectionButton} testID={`guest-navigation-drawer-section-${section.id}`}>
                    <View accessible={false} testID={`guest-navigation-drawer-section-${section.id}-chevron`}><SymbolView accessibilityElementsHidden name={expandedSection === section.id ? { android: 'keyboard_arrow_down', ios: 'chevron.down', web: 'keyboard_arrow_down' } : { android: 'keyboard_arrow_right', ios: 'chevron.right', web: 'keyboard_arrow_right' }} size={tokens.typography.size.sectionTitle} tintColor={tokens.color.muted} /></View>
                    <View accessible={false} testID={`guest-navigation-drawer-section-${section.id}-icon`}><SymbolView accessibilityElementsHidden name={section.icon} size={tokens.typography.size.sectionTitle} tintColor={tokens.color.muted} /></View>
                    <Text style={guestNavigationStyles.drawerSectionTitle}>{section.label}</Text>
                  </Pressable>
                  {expandedSection === section.id ? section.links.map((link) => <DrawerLink key={link.path} link={link} onPress={requestGuestNavigation} pathname={pathname} snapshotAvailable={isCheckedOut} />) : null}
                </View>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </Modal> : null}
      <ConfirmationModal
        body={pendingNavigation?.guard.message ?? ''}
        confirmLabel="Salir"
        onCancel={() => setPendingNavigation(null)}
        onConfirm={discardAndNavigate}
        testID="guest-navigation-discard-modal"
        title={pendingNavigation?.guard.title ?? '¿Descartar cambios?'}
        visible={pendingNavigation !== null}
      />
    </GuestNavigationMenuContext.Provider>
  );
}

export function useGuestNavigationMenu(): GuestNavigationMenuContextValue {
  return useContext(GuestNavigationMenuContext);
}
