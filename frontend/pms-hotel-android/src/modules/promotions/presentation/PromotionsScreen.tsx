import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GuestChildHeader } from '@/modules/navigation';
import { type PromotionsService } from '@/modules/promotions/data/services/PromotionsService';
import { type Promotion } from '@/modules/promotions/domain/Promotions';
import { tokens } from '@/shared/theme/tokens';
import { deriveRemoteState } from '@/state/remoteState';

import { usePromotions } from './hooks/usePromotions';

export interface PromotionsScreenProps {
  service?: PromotionsService;
}

function StateCard({ body, offline = false, onRetry, testID, title }: { body: string; offline?: boolean; onRetry: () => void; testID: string; title: string }) {
  return (
    <View style={[styles.card, offline && styles.offlineCard]} testID={testID}>
      <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable accessibilityLabel="Reintentar Promociones" accessibilityRole="button" onPress={onRetry} style={styles.button} testID="promotions-retry">
        <Text style={styles.buttonText}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

function PromotionDetailsModal({ promotion, onClose }: { promotion: Promotion | null; onClose: () => void }) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={promotion !== null}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.modalBackdrop} testID="promotions-details-modal">
        <Pressable accessible={false} onPress={onClose} style={[StyleSheet.absoluteFill, styles.backdrop]} testID="promotions-details-backdrop" />
        <View accessibilityViewIsModal style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeading}>
              <Text accessibilityRole="header" style={styles.modalTitle}>{promotion?.title}</Text>
              <Text style={styles.benefit}>{promotion?.benefitText}</Text>
            </View>
            <Pressable accessibilityLabel="Cerrar detalles" accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.buttonPressed]} testID="promotions-details-close">
              <Text accessible={false} style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator>
            {promotion?.details.map((detail) => (
              <View key={detail.key} style={styles.modalDetail} testID={`promotion-detail-${detail.key}`}>
                <Text style={styles.detailLabel}>{detail.label}</Text>
                <Text style={styles.detailValue}>{detail.valueText}</Text>
              </View>
            ))}
          </ScrollView>
          <Pressable accessibilityLabel="Cerrar detalles de promoción" accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} testID="promotions-details-close-action">
            <Text style={styles.buttonText}>Cerrar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export function PromotionsScreen({ service }: PromotionsScreenProps) {
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const query = usePromotions(service);
  const remoteState = deriveRemoteState(query, () => false);
  const backToAccount = () => router.dismissTo('/account');
  const retry = () => {
    setSelectedPromotion(null);
    void query.refetch();
  };

  return (
    <View style={styles.screen} testID="promotions-screen">
      <GuestChildHeader backAccessibilityLabel="Volver a mi cuenta" backTestID="promotions-back" onBack={backToAccount} title="Promociones" />
      <ScrollView contentContainerStyle={styles.content}>
        {remoteState.kind === 'loading' ? (
          <View style={styles.loading} testID="promotions-loading">
            <Text accessibilityRole="header" style={styles.heading}>Cargando Promociones</Text>
            <Text style={styles.body}>Estamos recuperando ofertas aplicables…</Text>
            <View style={styles.skeleton} />
            <View style={styles.skeleton} />
          </View>
        ) : null}
        {remoteState.kind === 'error' ? <StateCard body="Reintenta para recuperar ofertas aplicables." onRetry={retry} testID="promotions-error" title="Error en Promociones" /> : null}
        {remoteState.kind === 'offline' ? <StateCard body="Conéctate y reintenta para recuperar ofertas aplicables." offline onRetry={retry} testID="promotions-offline" title="Promociones sin conexión" /> : null}
        {remoteState.kind === 'success' ? (
          <>
            <View accessibilityLabel={`Ofertas aplicables: ${remoteState.data.applicableCountText}`} style={styles.summaryCard} testID="promotions-summary">
              <Text accessibilityRole="header" style={styles.summaryHeading}>Ofertas aplicables</Text>
              <Text style={styles.count}>{remoteState.data.applicableCountText}</Text>
              <Text style={styles.summaryText}>{remoteState.data.accountContextText}</Text>
              <Text style={styles.summaryText}>{remoteState.data.channelText}</Text>
            </View>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Promociones aplicables</Text>
            <View style={styles.items} testID="promotions-items">
              {remoteState.data.items.map((item) => {
                const validity = item.details.find((detail) => detail.key === 'validity');
                return (
                  <View key={item.key} style={styles.card} testID={`promotion-${item.key}`}>
                    <View style={styles.cardHeading}>
                      <Text accessibilityRole="header" style={styles.heading}>{item.title}</Text>
                      <Text style={styles.benefit}>{item.benefitText}</Text>
                    </View>
                    {validity ? <Text style={styles.cardSummary}>{`${validity.label}: ${validity.valueText}`}</Text> : null}
                    <Pressable accessibilityLabel={`Ver detalles de ${item.title}`} accessibilityRole="button" accessibilityState={{ expanded: selectedPromotion?.key === item.key }} onPress={() => setSelectedPromotion(item)} style={({ pressed }) => [styles.detailsButton, pressed && styles.buttonPressed]} testID={`promotion-${item.key}-details`}>
                      <Text style={styles.detailsButtonText}>Ver detalles</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>
      <PromotionDetailsModal onClose={() => setSelectedPromotion(null)} promotion={remoteState.kind === 'success' ? selectedPromotion : null} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: tokens.color.surface, flex: 1 },
  content: { gap: tokens.space.md, padding: tokens.layout.screenInset },
  loading: { gap: tokens.space.sm },
  card: { backgroundColor: tokens.color.white, borderColor: tokens.color.border, borderRadius: tokens.radius.card, borderWidth: 1, gap: tokens.space.sm, padding: tokens.space.lg },
  offlineCard: { backgroundColor: tokens.color.pendingSurface },
  summaryCard: { backgroundColor: tokens.color.surfaceAccent, borderColor: tokens.color.brandSoft, borderRadius: tokens.radius.card, borderWidth: 1, gap: tokens.space.xs, padding: tokens.space.xl },
  summaryHeading: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.sectionTitle, fontWeight: '600' },
  count: { color: tokens.color.brand, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.title, fontWeight: '600' },
  summaryText: { color: tokens.color.ink, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
  sectionTitle: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.sectionTitle, fontWeight: '600' },
  items: { gap: tokens.space.sm },
  cardHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  benefit: { color: tokens.color.brand, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
  cardSummary: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
  heading: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.sectionTitle, fontWeight: '600' },
  body: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
  button: { alignItems: 'center', backgroundColor: tokens.color.brand, borderRadius: tokens.radius.control, justifyContent: 'center', minHeight: tokens.layout.buttonHeight, paddingHorizontal: tokens.space.md },
  buttonText: { color: tokens.color.white, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
  detailsButton: { alignItems: 'center', backgroundColor: tokens.color.surfaceAccent, borderColor: tokens.color.brandSoft, borderRadius: tokens.radius.control, borderWidth: 1, justifyContent: 'center', minHeight: tokens.layout.controlHeight, paddingHorizontal: tokens.space.md },
  detailsButtonText: { color: tokens.color.brand, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
  buttonPressed: { opacity: 0.8 },
  skeleton: { backgroundColor: tokens.color.border, borderRadius: tokens.radius.control, height: tokens.layout.controlHeight },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: tokens.color.black, opacity: 0.35 },
  modalSheet: { backgroundColor: tokens.color.white, borderTopLeftRadius: tokens.radius.card, borderTopRightRadius: tokens.radius.card, gap: tokens.space.md, maxHeight: '82%', padding: tokens.space.lg },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  modalHeading: { flex: 1, gap: tokens.space.xs },
  modalTitle: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.title, fontWeight: '600' },
  closeButton: { alignItems: 'center', borderRadius: tokens.radius.control, justifyContent: 'center', minHeight: tokens.layout.controlHeight, minWidth: tokens.layout.controlHeight },
  closeButtonText: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.title, lineHeight: tokens.typography.size.title },
  modalContent: { gap: tokens.space.sm },
  modalDetail: { borderBottomColor: tokens.color.border, borderBottomWidth: 1, gap: tokens.space.xs, paddingBottom: tokens.space.sm },
  detailLabel: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
  detailValue: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium, fontWeight: '500' },
});
