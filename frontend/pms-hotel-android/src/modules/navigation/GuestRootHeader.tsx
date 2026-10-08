import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGuestNavigationMenu } from '@/modules/navigation/GuestNavigationMenuProvider';
import { guestNavigationStyles } from '@/modules/navigation/guestNavigationStyles';

export function GuestRootHeader({ onMenuPress, title }: { onMenuPress?: () => void; title: string }) {
  const { openMenu } = useGuestNavigationMenu();
  return (
    <SafeAreaView edges={['top']} style={guestNavigationStyles.rootHeaderSafeArea} testID="guest-root-header">
      <View style={guestNavigationStyles.rootHeader}>
        <Text accessibilityRole="header" style={guestNavigationStyles.rootHeaderTitle}>{title}</Text>
        <Pressable accessibilityLabel="Abrir menú" accessibilityRole="button" onPress={onMenuPress ?? openMenu} style={guestNavigationStyles.menuButton} testID="guest-navigation-menu-button">
          <Text accessible={false} style={guestNavigationStyles.menuButtonLabel}>☰</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
