import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { technicalServicesStyles } from '@/modules/stay/presentation/technicalServicesStyles';

/**
 * Navigation handoff required by IMP-AND-0102. It deliberately contains no
 * service catalogue, request state, remote data, or IMP-AND-0103 behaviour.
 */
export default function ServicesTechnicalRoute() {
  return (
    <View style={technicalServicesStyles.screen} testID="services-technical-route">
      <Text style={technicalServicesStyles.title}>Servicios</Text>
      <Text style={technicalServicesStyles.body}>Disponible en una tarea posterior.</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={technicalServicesStyles.backButton}
      >
        <Text style={technicalServicesStyles.backButtonLabel}>Volver a mi estadía</Text>
      </Pressable>
    </View>
  );
}
