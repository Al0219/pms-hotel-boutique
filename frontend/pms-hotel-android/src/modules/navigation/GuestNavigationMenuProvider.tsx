import { type Href, router, usePathname } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BackHandler,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  guestNavigationDrawerSections,
  type GuestNavigationDrawerLink,
  type GuestNavigationDrawerSection,
} from "@/modules/navigation/GuestNavigationShell";
import { guestFeatureIcons } from "@/modules/navigation/guestFeatureIcons";
import { useCheckoutStatus } from "@/modules/checkout";
import { useGuestAuthSession, useGuestLogout } from "@/modules/guest-auth";
import { guestNavigationStyles } from "@/modules/navigation/guestNavigationStyles";
import { tokens } from "@/shared/theme/tokens";
import { ConfirmationModal } from "@/shared/components";

export interface GuestNavigationGuard {
  isDirty: boolean;
  message: string;
  onDiscard?: () => void;
  title: string;
}

type PendingGuestIntent =
  | { guard: GuestNavigationGuard; kind: "navigate"; path: string }
  | { guard: GuestNavigationGuard; kind: "logout" };

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
const GuestNavigationMenuContext =
  createContext<GuestNavigationMenuContextValue>(detachedValue);

function drawerLinkTestID(link: GuestNavigationDrawerLink): string {
  return `guest-navigation-drawer-link-${link.label.toLowerCase().replaceAll(" ", "-")}`;
}

function isDrawerLinkActive(
  link: GuestNavigationDrawerLink,
  pathname: string,
): boolean {
  if (pathname.startsWith("/services/requests")) {
    return link.path === "/services/requests";
  }

  return pathname === link.path || pathname.startsWith(`${link.path}/`);
}

function DrawerLink({
  link,
  onPress,
  pathname,
  snapshotAvailable,
}: {
  link: GuestNavigationDrawerLink;
  onPress: (path: string) => void;
  pathname: string;
  snapshotAvailable: boolean;
}) {
  const active = isDrawerLinkActive(link, pathname);
  const disabled = Boolean(link.requiresCheckoutSnapshot && !snapshotAvailable);

  return (
    <Pressable
      accessibilityHint={
        disabled ? "Disponible después del check-out." : undefined
      }
      accessibilityLabel={link.label}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={() => onPress(link.path)}
      style={({ pressed }) => [
        guestNavigationStyles.drawerLink,
        active && guestNavigationStyles.drawerLinkActive,
        pressed && guestNavigationStyles.drawerItemPressed,
      ]}
      testID={drawerLinkTestID(link)}
    >
      <SymbolView
        accessibilityElementsHidden
        name={link.icon}
        size={tokens.typography.size.sectionTitle}
        tintColor={active ? tokens.color.brand : tokens.color.muted}
      />
      <Text
        style={[
          guestNavigationStyles.drawerLinkLabel,
          active && guestNavigationStyles.drawerLinkLabelActive,
        ]}
      >
        {link.label}
      </Text>
    </Pressable>
  );
}

/** Owns the Guest drawer once for the guest route tree. */
export function GuestNavigationMenuProvider({ children }: PropsWithChildren) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [expandedSection, setExpandedSection] = useState<
    GuestNavigationDrawerSection["id"] | null
  >(null);
  const [pendingIntent, setPendingIntent] = useState<PendingGuestIntent | null>(
    null,
  );
  const [logoutConfirmationVisible, setLogoutConfirmationVisible] =
    useState(false);
  const guardRef = useRef<GuestNavigationGuard | null>(null);
  const pathname = usePathname();
  const { session } = useGuestAuthSession();
  const logout = useGuestLogout();
  const { isCheckedOut } = useCheckoutStatus();

  const openMenu = useCallback(() => {
    setExpandedSection(
      guestNavigationDrawerSections.find((section) =>
        section.links.some((link) => isDrawerLinkActive(link, pathname)),
      )?.id ?? null,
    );
    setDrawerVisible(true);
  }, [pathname]);
  const closeMenu = useCallback(() => setDrawerVisible(false), []);

  /** Shared navigation intent so dirty feature screens never need to know the drawer implementation. */
  const requestGuestNavigation = useCallback(
    (path: string) => {
      if (path === pathname) {
        closeMenu();
        return;
      }
      if (guardRef.current?.isDirty) {
        setPendingIntent({ guard: guardRef.current, kind: "navigate", path });
        return;
      }
      closeMenu();
      router.replace(path as Href);
    },
    [closeMenu, pathname],
  );

  const requestLogout = useCallback(() => {
    if (guardRef.current?.isDirty) {
      setPendingIntent({ guard: guardRef.current, kind: "logout" });
      return;
    }
    setLogoutConfirmationVisible(true);
  }, []);

  const registerNavigationGuard = useCallback((guard: GuestNavigationGuard) => {
    guardRef.current = guard;
    return () => {
      if (guardRef.current === guard) guardRef.current = null;
    };
  }, []);

  const discardPendingIntent = useCallback(() => {
    const intent = pendingIntent;
    setPendingIntent(null);
    intent?.guard.onDiscard?.();
    if (!intent) return;
    if (intent.kind === "logout") {
      setLogoutConfirmationVisible(true);
      return;
    }
    closeMenu();
    router.replace(intent.path as Href);
  }, [closeMenu, pendingIntent]);

  const performLogout = useCallback(() => {
    closeMenu();
    setLogoutConfirmationVisible(false);
    logout();
  }, [closeMenu, logout]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (drawerVisible) {
        closeMenu();
        return true;
      }
      if (logoutConfirmationVisible) {
        setLogoutConfirmationVisible(false);
        return true;
      }
      if (pendingIntent) {
        setPendingIntent(null);
        return true;
      }
      if (pathname === "/account") {
        requestLogout();
        return true;
      }
      if (
        pathname === "/services" ||
        pathname === "/valet" ||
        pathname === "/hotel"
      ) {
        router.replace("/account");
        return true;
      }
      return false;
    });

    return () => listener.remove();
  }, [
    closeMenu,
    drawerVisible,
    logoutConfirmationVisible,
    pathname,
    pendingIntent,
    requestLogout,
  ]);

  const value = useMemo(
    () => ({ openMenu, registerNavigationGuard, requestGuestNavigation }),
    [openMenu, registerNavigationGuard, requestGuestNavigation],
  );

  return (
    <GuestNavigationMenuContext.Provider value={value}>
      {children}
      {drawerVisible ? (
        <Modal
          animationType="fade"
          onRequestClose={closeMenu}
          transparent
          visible
        >
          <SafeAreaView
            edges={["top", "bottom"]}
            style={guestNavigationStyles.drawerModal}
            testID="guest-navigation-drawer"
          >
            <Pressable accessibilityLabel="Cerrar menú" accessibilityRole="button" onPress={closeMenu} style={guestNavigationStyles.drawerBackdrop} testID="guest-navigation-drawer-backdrop">
              <View style={guestNavigationStyles.drawerBackdropFill} />
            </Pressable>
            <View
              accessibilityViewIsModal
              style={guestNavigationStyles.drawer}
              testID="guest-navigation-drawer-panel"
            >
              <View style={guestNavigationStyles.drawerHeader}>
                <View style={guestNavigationStyles.drawerHeaderCopy}>
                  <Text
                    accessibilityRole="header"
                    style={guestNavigationStyles.drawerTitle}
                  >
                    Menú
                  </Text>
                  <Text style={guestNavigationStyles.drawerSubtitle}>
                    Navega por tu estancia
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Cerrar menú"
                  accessibilityRole="button"
                  onPress={closeMenu}
                  style={({ pressed }) => [
                    guestNavigationStyles.drawerCloseButton,
                    pressed && guestNavigationStyles.drawerItemPressed,
                  ]}
                  testID="guest-navigation-drawer-close"
                >
                  <SymbolView
                    accessibilityElementsHidden
                    name={{ android: "close", ios: "xmark", web: "close" }}
                    size={tokens.typography.size.sectionTitle}
                    tintColor={tokens.color.inkStrong}
                  />
                </Pressable>
              </View>
              <ScrollView
                contentContainerStyle={guestNavigationStyles.drawerSections}
                style={guestNavigationStyles.drawerBody}
                testID="guest-navigation-drawer-body"
              >
                {guestNavigationDrawerSections.map((section) => {
                  const visibleLinks = section.links.filter(
                    (link) =>
                      Boolean(session) ||
                      (link.path !== "/account/profile" &&
                        link.path !== "/account/rewards" &&
                        link.path !== "/reservations"),
                  );
                  if (visibleLinks.length === 0) return null;
                  return (
                    <View
                      key={section.id}
                      style={guestNavigationStyles.drawerSection}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{
                          expanded: expandedSection === section.id,
                        }}
                        onPress={() =>
                          setExpandedSection((current) =>
                            current === section.id ? null : section.id,
                          )
                        }
                        style={guestNavigationStyles.drawerSectionButton}
                        testID={`guest-navigation-drawer-section-${section.id}`}
                      >
                        <View
                          accessible={false}
                          testID={`guest-navigation-drawer-section-${section.id}-chevron`}
                        >
                          <SymbolView
                            accessibilityElementsHidden
                            name={
                              expandedSection === section.id
                                ? {
                                    android: "keyboard_arrow_down",
                                    ios: "chevron.down",
                                    web: "keyboard_arrow_down",
                                  }
                                : {
                                    android: "keyboard_arrow_right",
                                    ios: "chevron.right",
                                    web: "keyboard_arrow_right",
                                  }
                            }
                            size={tokens.typography.size.sectionTitle}
                            tintColor={tokens.color.muted}
                          />
                        </View>
                        <View
                          accessible={false}
                          testID={`guest-navigation-drawer-section-${section.id}-icon`}
                        >
                          <SymbolView
                            accessibilityElementsHidden
                            name={section.icon}
                            size={tokens.typography.size.sectionTitle}
                            tintColor={tokens.color.muted}
                          />
                        </View>
                        <Text style={guestNavigationStyles.drawerSectionTitle}>
                          {section.label}
                        </Text>
                      </Pressable>
                      {expandedSection === section.id
                        ? visibleLinks.map((link) => (
                            <DrawerLink
                              key={link.path}
                              link={link}
                              onPress={requestGuestNavigation}
                              pathname={pathname}
                              snapshotAvailable={isCheckedOut}
                            />
                          ))
                        : null}
                    </View>
                  );
                })}
              </ScrollView>
              <View
                style={guestNavigationStyles.drawerLogoutArea}
                testID="guest-navigation-drawer-footer"
              >
                <Pressable
                  accessibilityLabel="Cerrar sesión"
                  accessibilityRole="button"
                  onPress={requestLogout}
                  style={({ pressed }) => [
                    guestNavigationStyles.drawerLogout,
                    pressed && guestNavigationStyles.drawerItemPressed,
                  ]}
                  testID="guest-navigation-drawer-logout"
                >
                  <SymbolView
                    accessibilityElementsHidden
                    name={guestFeatureIcons.logout}
                    size={tokens.typography.size.sectionTitle}
                    tintColor={tokens.color.destructive}
                  />
                  <Text style={guestNavigationStyles.drawerLogoutLabel}>
                    Cerrar sesión
                  </Text>
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      ) : null}
      <ConfirmationModal
        body={pendingIntent?.guard.message ?? ""}
        confirmLabel="Salir"
        onCancel={() => setPendingIntent(null)}
        onConfirm={discardPendingIntent}
        testID="guest-navigation-discard-modal"
        title={pendingIntent?.guard.title ?? "¿Descartar cambios?"}
        visible={pendingIntent !== null}
      />
      <ConfirmationModal
        body="Volverás a la pantalla de inicio de sesión."
        confirmLabel="Cerrar sesión"
        destructive
        onCancel={() => setLogoutConfirmationVisible(false)}
        onConfirm={performLogout}
        testID="guest-navigation-logout-modal"
        title="¿Cerrar sesión?"
        visible={logoutConfirmationVisible}
      />
    </GuestNavigationMenuContext.Provider>
  );
}

export function useGuestNavigationMenu(): GuestNavigationMenuContextValue {
  return useContext(GuestNavigationMenuContext);
}
