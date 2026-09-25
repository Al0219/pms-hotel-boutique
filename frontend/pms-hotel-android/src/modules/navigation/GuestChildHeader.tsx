import { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGuestNavigationMenu } from '@/modules/navigation/GuestNavigationMenuProvider';
import { guestNavigationStyles } from '@/modules/navigation/guestNavigationStyles';

export function GuestChildHeader({ backAccessibilityLabel = 'Volver', backTestID = 'guest-child-header-back', onBack, rightAccessory, title }: { backAccessibilityLabel?: string; backTestID?: string; onBack: () => void; rightAccessory?: ReactNode; title: string }) {
  const { openMenu } = useGuestNavigationMenu();
  return (
    <SafeAreaView edges={['top']} style={guestNavigationStyles.rootHeaderSafeArea} testID="guest-child-header">
      <View style={guestNavigationStyles.rootHeader}>
        <Pressable accessibilityLabel={backAccessibilityLabel} accessibilityRole="button" onPress={onBack} style={guestNavigationStyles.childBackButton} testID={backTestID}>
          <Text accessible={false} style={guestNavigationStyles.childBackArrow}>←</Text>
        </Pressable>
        <Text accessibilityRole="header" numberOfLines={1} style={guestNavigationStyles.childHeaderTitle}>{title}</Text>
        <View style={guestNavigationStyles.childHeaderActions}>
          {rightAccessory}
          <Pressable accessibilityLabel="Abrir menú" accessibilityRole="button" onPress={openMenu} style={guestNavigationStyles.menuButton} testID="guest-child-header-menu">
            <Text accessible={false} style={guestNavigationStyles.menuButtonLabel}>☰</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
