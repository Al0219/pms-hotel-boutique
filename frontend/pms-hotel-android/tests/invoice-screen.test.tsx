import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';

import { type InvoiceDocumentService, CheckoutSessionProvider, InvoiceScreen, useCheckoutSession } from '@/modules/checkout';
import { GuestNavigationMenuProvider } from '@/modules/navigation';
import { AppClockProvider } from '@/shared/time';

function SeededInvoice({ documentService }: { documentService: InvoiceDocumentService }) {
  const { createSnapshot } = useCheckoutSession();
  useEffect(() => {
    createSnapshot(
      { checks: [], departureNoteText: '', expectedDepartureText: 'Salida 12:00', roomDisplayText: 'Habitación 204', stayDatesText: '28 ago – 18 sept' },
      { items: [], paidGuaranteeText: '', pendingBalanceText: '', totalStayText: '', totalText: 'Total · Q0.00' },
    );
  }, [createSnapshot]);
  return <InvoiceScreen documentService={documentService} />;
}

async function setup(documentService: InvoiceDocumentService) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}><AppClockProvider initialMode="IN_STAY">
      <CheckoutSessionProvider>
        <GuestNavigationMenuProvider>
          <SeededInvoice documentService={documentService} />
        </GuestNavigationMenuProvider>
      </CheckoutSessionProvider>
    </AppClockProvider></QueryClientProvider>,
  );
}

describe('InvoiceScreen PDF actions', () => {
  it('shows open/share only after generating and never regenerates to open or share', async () => {
    const generate = jest.fn().mockResolvedValue({ uri: 'file://first.pdf' });
    const open = jest.fn().mockResolvedValue(undefined);
    const share = jest.fn().mockResolvedValue(undefined);
    const ui = await setup({ generate, open, share });

    await waitFor(() => expect(ui.getByTestId('invoice-generate-pdf')).toBeTruthy());
    expect(ui.queryByTestId('invoice-open-pdf')).toBeNull();
    expect(ui.queryByTestId('invoice-share-pdf')).toBeNull();
    expect(ui.queryByTestId('invoice-email-pdf')).toBeNull();

    await act(async () => { fireEvent.press(ui.getByTestId('invoice-generate-pdf')); });
    await waitFor(() => expect(ui.getByText('PDF generado correctamente.')).toBeTruthy());
    expect(ui.getByText('Generar nuevamente')).toBeTruthy();
    expect(ui.getByText('Ver PDF')).toBeTruthy();
    expect(ui.getByText('Compartir PDF')).toBeTruthy();
    expect(ui.getByText('Enviar por correo')).toBeTruthy();

    await act(async () => { fireEvent.press(ui.getByTestId('invoice-open-pdf')); });
    await act(async () => { fireEvent.press(ui.getByTestId('invoice-share-pdf')); });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('file://first.pdf');
    expect(share).toHaveBeenCalledWith('file://first.pdf');
  });

  it('keeps the generated URI after opening/sharing failures and replaces it only after regenerate', async () => {
    const generate = jest.fn()
      .mockResolvedValueOnce({ uri: 'file://first.pdf' })
      .mockResolvedValueOnce({ uri: 'file://second.pdf' });
    const open = jest.fn().mockRejectedValue(new Error('no viewer'));
    const share = jest.fn().mockRejectedValue(new Error('no share'));
    const ui = await setup({ generate, open, share });

    await act(async () => { fireEvent.press(ui.getByTestId('invoice-generate-pdf')); });
    await waitFor(() => expect(ui.getByTestId('invoice-open-pdf')).toBeTruthy());

    await act(async () => { fireEvent.press(ui.getByTestId('invoice-open-pdf')); });
    await waitFor(() => expect(ui.getByTestId('invoice-open-error')).toBeTruthy());
    await act(async () => { fireEvent.press(ui.getByTestId('invoice-share-pdf')); });
    await waitFor(() => expect(ui.getByTestId('invoice-share-error')).toBeTruthy());
    expect(share).toHaveBeenLastCalledWith('file://first.pdf');

    await act(async () => { fireEvent.press(ui.getByTestId('invoice-generate-pdf')); });
    await waitFor(() => expect(generate).toHaveBeenCalledTimes(2));
    await act(async () => { fireEvent.press(ui.getByTestId('invoice-share-pdf')); });
    expect(share).toHaveBeenLastCalledWith('file://second.pdf');
  });

  it('keeps only generation available when PDF materialization fails', async () => {
    const generate = jest.fn().mockRejectedValue(new Error('copy failed'));
    const open = jest.fn();
    const share = jest.fn();
    const ui = await setup({ generate, open, share });

    await waitFor(() => expect(ui.getByText('Generar PDF')).toBeTruthy());
    expect(ui.queryByText('Ver PDF')).toBeNull();
    expect(ui.queryByText('Compartir PDF')).toBeNull();
    expect(ui.queryByText('Enviar por correo')).toBeNull();
    expect(ui.queryByText('Generar nuevamente')).toBeNull();
    await act(async () => { fireEvent.press(ui.getByTestId('invoice-generate-pdf')); });
    await waitFor(() => expect(ui.getByTestId('invoice-generate-error')).toHaveTextContent('No pudimos generar el PDF.'));
    expect(ui.getByText('Generar PDF')).toBeTruthy();
    expect(ui.queryByTestId('invoice-open-pdf')).toBeNull();
    expect(ui.queryByTestId('invoice-share-pdf')).toBeNull();
    expect(ui.queryByTestId('invoice-email-pdf')).toBeNull();
  });

});
