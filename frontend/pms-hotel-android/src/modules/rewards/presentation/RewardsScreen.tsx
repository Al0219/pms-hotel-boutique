import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { type RewardsService } from '@/modules/rewards/data/services/RewardsService';
import { GuestChildHeader } from '@/modules/navigation';
import { deriveRemoteState } from '@/state/remoteState';
import { tokens } from '@/shared/theme/tokens';

import { useRewards } from './hooks/useRewards';
import { getTierPresentation } from './rewardTierPresentation';

export interface RewardsScreenProps {
  service?: RewardsService;
}

function StateCard({ body, offline = false, onRetry, testID, title }: { body: string; offline?: boolean; onRetry: () => void; testID: string; title: string }) {
  return (
    <View style={[styles.card, offline && styles.offlineCard]} testID={testID}>
      <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable accessibilityLabel="Reintentar Rewards" accessibilityRole="button" onPress={onRetry} style={styles.button} testID="rewards-retry">
        <Text style={styles.buttonText}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

export function RewardsScreen({ service }: RewardsScreenProps) {
  const query = useRewards(service);
  const remoteState = deriveRemoteState(query, () => false);
  const backToAccount = () => router.dismissTo('/account');
  const tierPresentation = remoteState.kind === 'success' ? getTierPresentation(remoteState.data.currentLevelText) : null;

  return (
    <View style={styles.screen} testID="rewards-screen">
      <GuestChildHeader backAccessibilityLabel="Volver a mi cuenta" backTestID="rewards-back" onBack={backToAccount} title="Rewards" />
      <ScrollView contentContainerStyle={styles.content}>
        {remoteState.kind === 'loading' ? (
          <View style={styles.loading} testID="rewards-loading">
            <Text accessibilityRole="header" style={styles.heading}>Cargando Rewards</Text>
            <Text style={styles.body}>Estamos recuperando nivel y beneficios…</Text>
            <View style={styles.skeleton} />
            <View style={styles.skeleton} />
          </View>
        ) : null}
        {remoteState.kind === 'error' ? <StateCard body="Reintenta para recuperar nivel y beneficios." onRetry={() => void query.refetch()} testID="rewards-error" title="Error en Rewards" /> : null}
        {remoteState.kind === 'offline' ? <StateCard body="Conéctate y reintenta para recuperar nivel y beneficios." offline onRetry={() => void query.refetch()} testID="rewards-offline" title="Rewards sin conexión" /> : null}
        {remoteState.kind === 'success' ? (
          <>
            <View accessibilityLabel={`Nivel Rewards ${remoteState.data.currentLevelText}`} style={[styles.summaryCard, tierPresentation!.cardStyle]} testID={tierPresentation!.testID}>
              <Text style={[styles.eyebrow, tierPresentation!.eyebrowStyle]}>Nivel actual</Text>
              <Text accessibilityRole="header" style={[styles.level, tierPresentation!.levelStyle]}>{remoteState.data.currentLevelText}</Text>
              <Text style={[styles.summaryText, tierPresentation!.summaryTextStyle]}>{remoteState.data.progressText}</Text>
              <Text style={[styles.summaryText, tierPresentation!.summaryTextStyle]}>{remoteState.data.activeBenefitsText}</Text>
            </View>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Tus beneficios</Text>
            <View style={styles.metrics} testID="rewards-metrics">
              {remoteState.data.metrics.map((metric) => (
                <View key={metric.key} style={styles.metricCard} testID={`rewards-metric-${metric.key}`}>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                  <Text style={styles.metricValue}>{metric.valueText}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: tokens.color.surface, flex: 1 },
  content: { gap: tokens.space.md, padding: tokens.layout.screenInset },
  loading: { gap: tokens.space.sm },
  card: { backgroundColor: tokens.color.white, borderColor: tokens.color.border, borderRadius: tokens.radius.card, borderWidth: 1, gap: tokens.space.sm, padding: tokens.space.lg },
  offlineCard: { backgroundColor: tokens.color.pendingSurface },
  summaryCard: { borderRadius: tokens.radius.card, borderWidth: 1, gap: tokens.space.sm, padding: tokens.space.xl },
  eyebrow: { color: tokens.color.white, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium, fontWeight: '500' },
  level: { color: tokens.color.white, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.title, fontWeight: '600' },
  summaryText: { color: tokens.color.white, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
  sectionTitle: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.sectionTitle, fontWeight: '600' },
  metrics: { gap: tokens.space.sm },
  metricCard: { backgroundColor: tokens.color.white, borderColor: tokens.color.border, borderRadius: tokens.radius.card, borderWidth: 1, gap: tokens.space.xs, padding: tokens.space.md },
  metricLabel: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
  metricValue: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
  heading: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.sectionTitle, fontWeight: '600' },
  body: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
  button: { alignItems: 'center', backgroundColor: tokens.color.brand, borderRadius: tokens.radius.control, justifyContent: 'center', minHeight: tokens.layout.buttonHeight, paddingHorizontal: tokens.space.md },
  buttonText: { color: tokens.color.white, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
  skeleton: { backgroundColor: tokens.color.border, borderRadius: tokens.radius.control, height: tokens.layout.controlHeight },
});
