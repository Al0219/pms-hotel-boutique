import * as IntentLauncher from 'expo-intent-launcher';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { ExpoInvoiceDocumentService } from '@/modules/checkout/data/device/ExpoInvoiceDocumentService';
import { type CheckoutSessionSnapshot } from '@/modules/checkout/presentation/CheckoutSessionProvider';

jest.mock('expo-intent-launcher', () => ({ startActivityAsync: jest.fn() }));
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: { cache: { uri: 'file:///controlled-cache/' } } }));

const startActivityAsync = IntentLauncher.startActivityAsync as jest.Mock;
const printToFileAsync = Print.printToFileAsync as jest.Mock;
const isAvailableAsync = Sharing.isAvailableAsync as jest.Mock;
const shareAsync = Sharing.shareAsync as jest.Mock;
const FileMock = File as unknown as jest.Mock;
const temporaryPrintUri = 'file:///data/user/0/host.exp.exponent/cache/Print/temp.pdf';
const generatedPdfUri = 'file:///controlled-cache/hotel-boutique-CHK-1.pdf';
const printedBase64 = 'JVBERi0xLjQK';
const snapshot: CheckoutSessionSnapshot = {
  content: { checks: [], departureNoteText: '', expectedDepartureText: 'Salida 12:00', roomDisplayText: 'Habitación 204', stayDatesText: '28 ago – 18 sept' },
  departureNoteText: '',
  folio: { items: [], paidGuaranteeText: '', pendingBalanceText: '', totalStayText: 'Sin cargos registrados en esta sesión', totalText: 'Total · Q0.00' },
  generatedAt: new Date(2026, 8, 18, 10, 59),
  referenceText: 'CHK-1',
};

function withAndroid(run: () => Promise<void>) {
  const descriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  return run().finally(() => { if (descriptor) Object.defineProperty(Platform, 'OS', descriptor); });
}

describe('ExpoInvoiceDocumentService', () => {
  let destination: { contentUri: string; delete: jest.Mock; exists: boolean; size: number; type: string; uri: string; write: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    destination = {
      contentUri: 'content://hotel-boutique/invoice.pdf',
      delete: jest.fn(),
      exists: false,
      size: 0,
      type: 'application/pdf',
      uri: generatedPdfUri,
      write: jest.fn(() => { destination.exists = true; destination.size = 42; }),
    };
    FileMock.mockImplementation(() => destination);
    printToFileAsync.mockResolvedValue({ base64: printedBase64, numberOfPages: 1, uri: temporaryPrintUri });
    isAvailableAsync.mockResolvedValue(true);
    shareAsync.mockResolvedValue(undefined);
    startActivityAsync.mockResolvedValue(undefined);
  });

  it('materializes Print base64 directly in Paths.cache and returns only the stable cache URI', async () => {
    const result = await new ExpoInvoiceDocumentService().generate(snapshot);

    expect(printToFileAsync).toHaveBeenCalledWith(expect.objectContaining({ base64: true, html: expect.any(String) }));
    expect(FileMock).toHaveBeenCalledWith(Paths.cache, expect.stringMatching(/^hotel-boutique-CHK-1\.pdf$/));
    expect(destination.write).toHaveBeenCalledWith(printedBase64, { encoding: 'base64' });
    expect(destination.uri).not.toBe(temporaryPrintUri);
    expect(result).toEqual({ numberOfPages: 1, uri: generatedPdfUri });
    expect(startActivityAsync).not.toHaveBeenCalled();
    expect(isAvailableAsync).not.toHaveBeenCalled();
    expect(shareAsync).not.toHaveBeenCalled();
  });

  it('safely replaces an existing session filename before writing a regenerated PDF', async () => {
    destination.exists = true;

    await new ExpoInvoiceDocumentService().generate(snapshot);

    expect(destination.delete).toHaveBeenCalledTimes(1);
    expect(destination.write).toHaveBeenCalledWith(printedBase64, { encoding: 'base64' });
  });

  it('fails generation when Print has no base64 payload or the destination remains empty', async () => {
    printToFileAsync.mockResolvedValueOnce({ numberOfPages: 1, uri: temporaryPrintUri });
    await expect(new ExpoInvoiceDocumentService().generate(snapshot)).rejects.toThrow('printToFileAsync returned an empty PDF payload');

    destination.write.mockImplementationOnce(() => undefined);
    await expect(new ExpoInvoiceDocumentService().generate(snapshot)).rejects.toThrow('Materialized PDF is missing or empty');
  });

  it('shares only the stable generated file URI, never its content URI or Print URI', async () => {
    destination.exists = true;
    destination.size = 42;
    await new ExpoInvoiceDocumentService().share(generatedPdfUri);

    expect(shareAsync).toHaveBeenCalledWith(generatedPdfUri, { dialogTitle: 'Compartir resumen de estancia', mimeType: 'application/pdf' });
    expect(shareAsync).not.toHaveBeenCalledWith(destination.contentUri, expect.anything());
    expect(shareAsync).not.toHaveBeenCalledWith(temporaryPrintUri, expect.anything());
    expect(printToFileAsync).not.toHaveBeenCalled();
    expect(startActivityAsync).not.toHaveBeenCalled();
  });

  it('does not attempt native sharing when unavailable or when the generated file is gone', async () => {
    destination.exists = true;
    isAvailableAsync.mockResolvedValue(false);
    await expect(new ExpoInvoiceDocumentService().share(generatedPdfUri)).rejects.toThrow('Sharing is unavailable');
    expect(shareAsync).not.toHaveBeenCalled();

    destination.exists = false;
    await expect(new ExpoInvoiceDocumentService().share(generatedPdfUri)).rejects.toThrow('Generated PDF is no longer available');
    expect(isAvailableAsync).toHaveBeenCalledTimes(1);
  });

  it('preserves a native sharing failure as a sharing failure', async () => {
    destination.exists = true;
    shareAsync.mockRejectedValue(new Error('native share failed'));
    await expect(new ExpoInvoiceDocumentService().share(generatedPdfUri)).rejects.toThrow('native share failed');
  });

  it('opens the stable generated PDF through content URI with temporary read permission', async () => {
    destination.exists = true;
    await withAndroid(async () => { await new ExpoInvoiceDocumentService().open(generatedPdfUri); });

    expect(FileMock).toHaveBeenCalledWith(generatedPdfUri);
    expect(startActivityAsync).toHaveBeenCalledWith('android.intent.action.VIEW', {
      data: destination.contentUri,
      flags: 1,
      type: 'application/pdf',
    });
    expect(printToFileAsync).not.toHaveBeenCalled();
  });

  it('does not launch an Android intent when the generated PDF is missing or opening fails', async () => {
    await withAndroid(async () => {
      await expect(new ExpoInvoiceDocumentService().open(generatedPdfUri)).rejects.toThrow('Generated PDF is no longer available');
    });
    expect(startActivityAsync).not.toHaveBeenCalled();

    destination.exists = true;
    startActivityAsync.mockRejectedValue(new Error('no PDF viewer'));
    await withAndroid(async () => {
      await expect(new ExpoInvoiceDocumentService().open(generatedPdfUri)).rejects.toThrow('no PDF viewer');
    });
  });
});
