import { Text } from 'react-native';
import { tokens } from '@/shared/theme/tokens';

/** Static presentation only: never a replacement for a Backend response. */
export function DemoContentNotice({ detail }: { detail: string }) {
 return <Text style={{color:tokens.color.muted,fontFamily:tokens.typography.family,fontSize:tokens.typography.size.bodyMedium}} testID="demo-content-notice">Vista de demostración · {detail}</Text>;
}
