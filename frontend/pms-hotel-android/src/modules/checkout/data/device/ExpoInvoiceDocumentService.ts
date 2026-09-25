import * as IntentLauncher from 'expo-intent-launcher';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { type InvoiceDocumentResult, type InvoiceDocumentService } from '@/modules/checkout/data/services/InvoiceDocumentService';
import { buildInvoicePdfHtml } from '@/modules/checkout/domain/buildInvoicePdfHtml';
import { type CheckoutSessionSnapshot } from '@/modules/checkout/presentation/CheckoutSessionProvider';

const PDF_MIME_TYPE = 'application/pdf';
const FLAG_GRANT_READ_URI_PERMISSION = 1;

function serializeInvoiceError(error: unknown) {
  return error instanceof Error
    ? { errorMessage: error.message, errorName: error.name, errorStack: error.stack, errorString: String(error) }
    : { errorString: String(error) };
}

function safePdfFilename(snapshot: CheckoutSessionSnapshot) {
  const reference = snapshot.referenceText.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
  return 'hotel-boutique-' + (reference || 'resumen-estancia') + '.pdf';
}

function logPdf(stage: 'PRINT' | 'WRITE' | 'OPEN' | 'SHARE', details: Record<string, unknown>) {
  if (__DEV__) console.info('[Invoice PDF]', { platform: Platform.OS, stage, ...details });
}

function logPdfError(stage: 'PRINT' | 'WRITE' | 'OPEN' | 'SHARE', error: unknown, details: Record<string, unknown>) {
  if (__DEV__) console.error('[Invoice PDF][' + stage.toLowerCase() + '-error]', { ...serializeInvoiceError(error), platform: Platform.OS, stage, ...details });
}

export class ExpoInvoiceDocumentService implements InvoiceDocumentService {
  async generate(snapshot: CheckoutSessionSnapshot): Promise<InvoiceDocumentResult> {
    let generatedPdfUri: string | null = null;
    try {
      const printed = await Print.printToFileAsync({ base64: true, html: buildInvoicePdfHtml(snapshot) });
      if (!printed.base64) throw new Error('printToFileAsync returned an empty PDF payload');
      logPdf('PRINT', { printedUri: printed.uri });

      const destination = new File(Paths.cache, safePdfFilename(snapshot));
      generatedPdfUri = destination.uri;
      try {
        if (destination.exists) destination.delete();
        destination.write(printed.base64, { encoding: 'base64' });
        if (!destination.exists || destination.size <= 0) throw new Error('Materialized PDF is missing or empty');
        logPdf('WRITE', { exists: destination.exists, generatedPdfUri, size: destination.size, type: destination.type });
      } catch (error) {
        logPdfError('WRITE', error, { generatedPdfUri });
        throw error;
      }

      return { numberOfPages: printed.numberOfPages, uri: generatedPdfUri };
    } catch (error) {
      if (!generatedPdfUri) logPdfError('PRINT', error, {});
      throw error;
    }
  }

  async share(generatedPdfUri: string): Promise<void> {
    try {
      const file = new File(generatedPdfUri);
      if (!file.exists) throw new Error('Generated PDF is no longer available');
      const sharingAvailable = await Sharing.isAvailableAsync();
      logPdf('SHARE', { exists: file.exists, fileUri: generatedPdfUri, sharingAvailable, size: file.size });
      if (!sharingAvailable) throw new Error('Sharing is unavailable');
      await Sharing.shareAsync(generatedPdfUri, { dialogTitle: 'Compartir resumen de estancia', mimeType: PDF_MIME_TYPE });
    } catch (error) {
      logPdfError('SHARE', error, { fileUri: generatedPdfUri });
      throw error;
    }
  }

  async open(generatedPdfUri: string): Promise<void> {
    let contentUri: string | null = null;
    try {
      const file = new File(generatedPdfUri);
      if (!file.exists) throw new Error('Generated PDF is no longer available');
      if (Platform.OS !== 'android') throw new Error('Opening PDFs externally is unavailable on this platform');
      contentUri = file.contentUri;
      logPdf('OPEN', { contentUri, exists: file.exists, fileUri: generatedPdfUri, size: file.size });
      if (!contentUri) throw new Error('Generated PDF has no Android content URI');
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: FLAG_GRANT_READ_URI_PERMISSION,
        type: PDF_MIME_TYPE,
      });
    } catch (error) {
      logPdfError('OPEN', error, { contentUri, fileUri: generatedPdfUri });
      throw error;
    }
  }
}
