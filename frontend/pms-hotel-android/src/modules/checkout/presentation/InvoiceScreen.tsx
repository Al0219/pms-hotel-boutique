import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GuestChildHeader } from '@/modules/navigation';
import { useInvoiceActions } from '@/modules/checkout/presentation/hooks/useCheckout';
import { useCheckoutSession } from '@/modules/checkout/presentation/CheckoutSessionProvider';
import { tokens } from '@/shared/theme/tokens';

const back = () => router.dismissTo('/account');

export function InvoiceScreen() {
  const { snapshot } = useCheckoutSession();
  const { email, pdf } = useInvoiceActions();
  const [actionResult, setActionResult] = useState<string | null>(null);

  return (
    <View style={styles.screen} testID="invoice-screen">
      <GuestChildHeader backAccessibilityLabel="Volver a inicio" backTestID="invoice-back" onBack={back} title="Factura" />
      <ScrollView contentContainerStyle={styles.content}>
        {!snapshot ? (
          <View style={styles.card} testID="invoice-no-snapshot">
            <Text style={styles.heading}>No hay un resumen de checkout generado en esta sesión.</Text>
            <Pressable accessibilityRole="button" onPress={back} style={styles.button}>
              <Text style={styles.buttonText}>Volver a Inicio</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.heading}>Resumen</Text>
              <Text style={styles.body} testID="invoice-reference">{snapshot.referenceText}</Text>
              <Text style={styles.body} testID="invoice-generated-at">{snapshot.generatedAt.toLocaleString('es-GT')}</Text>
              {snapshot.folio.items.map((item) => (
                <View key={item.key} style={styles.item}>
                  <View style={styles.row}>
                    <Text style={styles.body}>{item.label}</Text>
                    <Text style={styles.body}>{item.priceText}</Text>
                  </View>
                  {item.amountNature === 'ESTIMATED' ? <Text style={styles.muted}>Tarifa estimada</Text> : null}
                  {item.lineItems?.map((line, index) => (
                    <View key={`${item.key}-${line.label}-${index}`} style={styles.row}>
                      <Text style={styles.body}>{line.quantity ? `${line.label} × ${line.quantity}` : line.label}</Text>
                      <Text style={styles.body}>{line.priceText}</Text>
                    </View>
                  ))}
                </View>
              ))}
              <Text style={styles.body} testID="invoice-total">{snapshot.folio.checkoutTotal?.text ?? snapshot.folio.totalText}</Text>
            </View>
            <Pressable accessibilityLabel="Generar PDF" accessibilityRole="button" disabled={pdf.isPending} onPress={() => pdf.mutate(undefined, { onSuccess: () => setActionResult('PDF generado') })} style={styles.button}>
              <Text style={styles.buttonText}>{pdf.isPending ? 'Generando PDF...' : 'Generar PDF'}</Text>
            </Pressable>
            <Pressable accessibilityLabel="Enviar por correo" accessibilityRole="button" disabled={email.isPending} onPress={() => email.mutate(undefined, { onSuccess: () => setActionResult('Correo enviado') })} style={styles.button}>
              <Text style={styles.buttonText}>{email.isPending ? 'Enviando correo...' : 'Enviar por correo'}</Text>
            </Pressable>
            {actionResult ? <Text accessibilityLiveRegion="polite" style={styles.body} testID="invoice-action-result">{actionResult}</Text> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: tokens.color.surface, flex: 1 },
  content: { gap: tokens.space.md, padding: tokens.layout.screenInset },
  card: { backgroundColor: tokens.color.white, borderColor: tokens.color.border, borderRadius: tokens.radius.card, borderWidth: 1, gap: tokens.space.sm, padding: tokens.space.md },
  item: { gap: tokens.space.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  heading: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.sectionTitle, fontWeight: '600' },
  body: { color: tokens.color.ink, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
  muted: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
  button: { alignItems: 'center', backgroundColor: tokens.color.brand, borderRadius: tokens.radius.control, minHeight: tokens.layout.buttonHeight, justifyContent: 'center', paddingHorizontal: tokens.space.md },
  buttonText: { color: tokens.color.white, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
});
