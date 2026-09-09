import { Text, View } from 'react-native';

import { foundationStyles } from '@/shared/theme/styles';

export default function GuestFoundationRoute() {
  return (
    <View style={foundationStyles.screen} testID="guest-foundation-route">
      <Text style={foundationStyles.title}>Android Foundation</Text>
      <Text style={foundationStyles.body}>Technical routing validation</Text>
    </View>
  );
}
