import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ExpoInvoiceDocumentService } from '@/modules/checkout/data/device/ExpoInvoiceDocumentService';
import { type InvoiceDocumentService } from '@/modules/checkout/data/services/InvoiceDocumentService';
import { GuestChildHeader } from '@/modules/navigation';
import { useInvoiceActions } from '@/modules/checkout/presentation/hooks/useCheckout';
import { useCheckoutSession } from '@/modules/checkout/presentation/CheckoutSessionProvider';
import { tokens } from '@/shared/theme/tokens';

const back = () => router.dismissTo('/account');
const invoiceDocumentService = new ExpoInvoiceDocumentService();

export function InvoiceScreen({ documentService = invoiceDocumentService }: { documentService?: InvoiceDocumentService }) {
  const { snapshot } = useCheckoutSession();
  const { email } = useInvoiceActions();
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [openingPdf, setOpeningPdf] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);
  const [generatedPdfUri, setGeneratedPdfUri] = useState<string | null>(null);

  async function generatePdf() {
    if (!snapshot || generatingPdf) return;
    setGeneratingPdf(true);
    setGenerateError(null);
    setOpenError(null);
    setShareError(null);
    setActionResult(null);
    setGeneratedPdfUri(null);
    try {
      const generated = await documentService.generate(snapshot);
      setGeneratedPdfUri(generated.uri);
      setActionResult('PDF generado correctamente.');
    } catch {
      setGenerateError('No pudimos generar el PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function openPdf() {
    if (!generatedPdfUri || openingPdf) return;
    setOpeningPdf(true);
    setOpenError(null);
    try {
      await documentService.open(generatedPdfUri);
    } catch {
      setOpenError('No encontramos una aplicación para abrir el PDF.');
    } finally {
      setOpeningPdf(false);
    }
  }

  async function sharePdf() {
    if (!generatedPdfUri || sharingPdf) return;
    setSharingPdf(true);
    setShareError(null);
    try {
      await documentService.share(generatedPdfUri);
    } catch {
      setShareError('El PDF fue generado, pero no pudimos abrir las opciones para compartir.');
    } finally {
      setSharingPdf(false);
    }
  }

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
                    <View key={item.key + '-' + line.label + '-' + index} style={styles.row}>
                      <Text style={styles.body}>{line.quantity ? line.label + ' × ' + line.quantity : line.label}</Text>
                      <Text style={styles.body}>{line.priceText}</Text>
                    </View>
                  ))}
                </View>
              ))}
              <Text style={styles.body} testID="invoice-total">{snapshot.folio.checkoutTotal?.text ?? snapshot.folio.totalText}</Text>
            </View>
            {generatedPdfUri ? (
              <>
                <Pressable accessibilityLabel="Ver PDF" accessibilityRole="button" disabled={openingPdf} onPress={() => { void openPdf(); }} style={styles.button} testID="invoice-open-pdf">
                  <Text style={styles.buttonText}>{openingPdf ? 'Abriendo PDF...' : 'Ver PDF'}</Text>
                </Pressable>
                <Pressable accessibilityLabel="Compartir PDF" accessibilityRole="button" disabled={sharingPdf} onPress={() => { void sharePdf(); }} style={styles.button} testID="invoice-share-pdf">
                  <Text style={styles.buttonText}>{sharingPdf ? 'Abriendo opciones...' : 'Compartir PDF'}</Text>
                </Pressable>
                <Pressable accessibilityLabel="Enviar por correo" accessibilityRole="button" disabled={email.isPending} onPress={() => email.mutate(undefined, { onSuccess: () => setActionResult('Solicitud de correo registrada en esta sesión.') })} style={styles.button} testID="invoice-email-pdf">
                  <Text style={styles.buttonText}>{email.isPending ? 'Enviando correo...' : 'Enviar por correo'}</Text>
                </Pressable>
              </>
            ) : null}
            <Pressable accessibilityLabel={generatedPdfUri ? 'Generar nuevamente' : 'Generar PDF'} accessibilityRole="button" disabled={generatingPdf} onPress={() => { void generatePdf(); }} style={styles.button} testID="invoice-generate-pdf">
              <Text style={styles.buttonText}>{generatingPdf ? 'Generando PDF...' : generatedPdfUri ? 'Generar nuevamente' : 'Generar PDF'}</Text>
            </Pressable>
            {actionResult ? <Text accessibilityLiveRegion="polite" style={styles.body} testID="invoice-action-result">{actionResult}</Text> : null}
            {generateError ? <Text accessibilityLiveRegion="polite" style={styles.body} testID="invoice-generate-error">{generateError}</Text> : null}
            {openError ? <Text accessibilityLiveRegion="polite" style={styles.body} testID="invoice-open-error">{openError}</Text> : null}
            {shareError ? <Text accessibilityLiveRegion="polite" style={styles.body} testID="invoice-share-error">{shareError}</Text> : null}
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
