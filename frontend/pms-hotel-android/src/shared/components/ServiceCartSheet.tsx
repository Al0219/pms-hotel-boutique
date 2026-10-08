import { type PropsWithChildren, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SwipeToDelete } from '@/shared/components/SwipeToDelete';
import { tokens } from '@/shared/theme/tokens';

export interface ServiceCartItemRowProps extends PropsWithChildren {
  deleteLabel: string;
  onRemove: () => void;
  rowTestID?: string;
  testID: string;
}

export function ServiceCartItemRow({ children, deleteLabel, onRemove, rowTestID, testID }: ServiceCartItemRowProps) {
  return (
    <View style={styles.itemRow} testID={rowTestID ?? `${testID}-row`}>
      <SwipeToDelete deleteLabel={deleteLabel} onDelete={onRemove} testID={testID}>
        {children}
      </SwipeToDelete>
    </View>
  );
}

export function ServiceCartSheet({ children, closeTestID, footer, onClose, testID, title, visible }: PropsWithChildren<{ closeTestID?: string; footer?: ReactNode; onClose: () => void; testID: string; title: string; visible: boolean }>) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.layer}>
        <Pressable accessibilityLabel="Cerrar carrito" onPress={onClose} style={styles.backdrop} testID={`${testID}-backdrop`} />
        <SafeAreaView edges={['bottom']} pointerEvents="box-none" style={styles.safeArea}>
          <View accessibilityViewIsModal style={styles.sheet} testID={testID}>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              <Pressable accessibilityLabel="Cerrar carrito" accessibilityRole="button" onPress={onClose} style={styles.close} testID={closeTestID ?? `${testID}-close`}>
                <Text style={styles.closeLabel}>×</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.body} testID={`${testID}-body`}>
              {children}
            </ScrollView>
            {footer ? <View style={styles.footer} testID={`${testID}-footer`}>{footer}</View> : null}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  layer: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,.35)' },
  safeArea: { flex: 1, justifyContent: 'flex-end' },
  sheet: { alignSelf: 'stretch', backgroundColor: tokens.color.surface, borderTopLeftRadius: tokens.radius.card, borderTopRightRadius: tokens.radius.card, maxHeight: '90%', minHeight: '56%', padding: tokens.layout.screenInset },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.sectionTitle, fontWeight: '600' },
  close: { alignItems: 'center', height: tokens.layout.controlHeight, justifyContent: 'center', width: tokens.layout.controlHeight },
  closeLabel: { color: tokens.color.inkStrong, fontSize: tokens.typography.size.title },
  body: { alignSelf: 'stretch', flex: 1, flexGrow: 1, flexShrink: 1, minHeight: 0, width: '100%' },
  content: { gap: tokens.space.md, paddingVertical: tokens.space.md },
  footer: { borderTopColor: tokens.color.border, borderTopWidth: 1, paddingTop: tokens.space.md },
  itemRow: { borderBottomColor: tokens.color.border, borderBottomWidth: 1, paddingBottom: tokens.space.md },
});
