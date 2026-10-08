import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { NetworkError } from '@/data/remote/http/HttpError';
import { type PromotionsFixtureDto } from '@/modules/promotions/data/dto/PromotionsFixtureDto';
import { mapPromotionsFixtureDto } from '@/modules/promotions/data/mappers/mapPromotionsFixtureDto';
import { MockPromotionsService } from '@/modules/promotions/data/mocks/MockPromotionsService';
import { promotionsFixture } from '@/modules/promotions/data/mocks/promotionsFixture';
import { type PromotionsService } from '@/modules/promotions/data/services/PromotionsService';
import { PromotionsScreen } from '@/modules/promotions/presentation/PromotionsScreen';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { gcTime: 0, retry: false },
    },
  });
}

async function renderPromotions(service: PromotionsService) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <PromotionsScreen service={service} />
    </QueryClientProvider>,
  );
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

describe('Promotions', () => {
  it('maps the approved presentation-only fixture without parsing commercial values', () => {
    expect(mapPromotionsFixtureDto(promotionsFixture)).toEqual({
      applicableCountText: '1',
      accountContextText: 'Cuenta Silver',
      channelText: 'DIRECT_APP',
      items: [
        {
          key: 'member-rate',
          title: 'Member Rate',
          benefitText: '−5%',
          details: [
            { key: 'eligibility', label: 'Elegibilidad', valueText: 'Cuenta Silver' },
            { key: 'channel', label: 'Canal', valueText: 'DIRECT_APP' },
            { key: 'combination', label: 'Combinación', valueText: 'Exclusiva' },
            { key: 'validity', label: 'Vigencia', valueText: 'Rate Plan vigente' },
            { key: 'availability', label: 'Disponibilidad', valueText: 'Requerida' },
          ],
        },
      ],
    });
    expect(() => mapPromotionsFixtureDto({ ...promotionsFixture, applicableCountText: ' ' })).toThrow('applicableCountText must not be blank');
  });

  it('does not create nullable defaults because the approved DTO has no optional fields', () => {
    expect(() => mapPromotionsFixtureDto({ ...promotionsFixture, items: [{ ...promotionsFixture.items[0], title: ' ' }] })).toThrow('title must not be blank');
  });

  it('returns fixture data through the mock service and propagates generic and network failures', async () => {
    await expect(new MockPromotionsService().getPromotions()).resolves.toEqual(promotionsFixture);
    const genericFailure = new Error('promotions unavailable');
    const offlineFailure = new NetworkError('offline');
    await expect(new MockPromotionsService({ getPromotions: async () => { throw genericFailure; } }).getPromotions()).rejects.toBe(genericFailure);
    await expect(new MockPromotionsService({ getPromotions: async () => { throw offlineFailure; } }).getPromotions()).rejects.toBe(offlineFailure);
  });

  it('renders loading while the query is unresolved', async () => {
    const pending = deferred<PromotionsFixtureDto>();
    const ui = await renderPromotions(new MockPromotionsService({ getPromotions: () => pending.promise }));

    expect(ui.getByTestId('promotions-loading')).toBeTruthy();
    expect(ui.getByText('Cargando Promociones')).toBeTruthy();
  });

  it('renders the approved summary, promotion and details', async () => {
    const ui = await renderPromotions(new MockPromotionsService());

    await waitFor(() => expect(ui.getByTestId('promotions-summary')).toBeTruthy());
    expect(ui.getByText('Ofertas aplicables')).toBeTruthy();
    expect(ui.getByText('1')).toBeTruthy();
    expect(ui.getAllByText('Cuenta Silver')).toHaveLength(1);
    expect(ui.getAllByText('DIRECT_APP')).toHaveLength(1);
    expect(ui.getByTestId('promotion-member-rate')).toBeTruthy();
    expect(ui.getByText('Member Rate')).toBeTruthy();
    expect(ui.getByText('−5%')).toBeTruthy();
    expect(ui.getByText('Vigencia: Rate Plan vigente')).toBeTruthy();
    expect(ui.getByTestId('promotion-member-rate-details').props.accessibilityRole).toBe('button');
  });

  it('opens and closes informational details for the selected promotion', async () => {
    const ui = await renderPromotions(new MockPromotionsService());

    await waitFor(() => expect(ui.getByTestId('promotion-member-rate-details')).toBeTruthy());
    await act(async () => {
      fireEvent.press(ui.getByTestId('promotion-member-rate-details'));
    });
    expect(ui.getByTestId('promotions-details-modal')).toBeTruthy();
    expect(ui.getByText('Elegibilidad')).toBeTruthy();
    expect(ui.getAllByText('Cuenta Silver')).toHaveLength(2);
    expect(ui.getByText('Combinación')).toBeTruthy();
    expect(ui.getByText('Exclusiva')).toBeTruthy();

    await act(async () => {
      fireEvent.press(ui.getByTestId('promotions-details-close'));
    });
    await waitFor(() => expect(ui.queryByTestId('promotions-details-modal')).toBeNull());
  });

  it('can open details for another promotion without creating a business action', async () => {
    const fixtureWithAnotherPromotion: PromotionsFixtureDto = {
      ...promotionsFixture,
      applicableCountText: '2',
      items: [
        ...promotionsFixture.items,
        {
          fixtureKey: 'stay-benefit',
          title: 'Beneficio de estadía',
          benefitText: 'Desayuno para dos',
          details: [
            { fixtureKey: 'validity', label: 'Vigencia', valueText: 'Durante la estadía actual' },
            { fixtureKey: 'channel', label: 'Canal', valueText: 'DIRECT_APP' },
          ],
        },
      ],
    };
    const ui = await renderPromotions(new MockPromotionsService({ getPromotions: async () => fixtureWithAnotherPromotion }));

    await waitFor(() => expect(ui.getByTestId('promotion-stay-benefit-details')).toBeTruthy());
    await act(async () => {
      fireEvent.press(ui.getByTestId('promotion-stay-benefit-details'));
    });
    expect(ui.getAllByText('Beneficio de estadía')).toHaveLength(2);
    expect(ui.getAllByText('Desayuno para dos')).toHaveLength(2);
    ['Aplicar', 'Canjear', 'Activar', 'Usar ahora'].forEach((label) => expect(ui.queryByText(label)).toBeNull());
  });

  it('renders a generic error and retries the real query', async () => {
    const getPromotions = jest.fn<Promise<PromotionsFixtureDto>, []>()
      .mockRejectedValueOnce(new Error('promotions unavailable'))
      .mockResolvedValueOnce(promotionsFixture);
    const ui = await renderPromotions(new MockPromotionsService({ getPromotions }));

    await waitFor(() => expect(ui.getByTestId('promotions-error')).toBeTruthy());
    await act(async () => {
      fireEvent.press(ui.getByTestId('promotions-retry'));
    });
    await waitFor(() => expect(ui.getByTestId('promotions-summary')).toBeTruthy());
    expect(getPromotions).toHaveBeenCalledTimes(2);
  });

  it('renders NetworkError as offline and allows retry', async () => {
    const getPromotions = jest.fn<Promise<PromotionsFixtureDto>, []>()
      .mockRejectedValueOnce(new NetworkError('offline'))
      .mockResolvedValueOnce(promotionsFixture);
    const ui = await renderPromotions(new MockPromotionsService({ getPromotions }));

    await waitFor(() => expect(ui.getByTestId('promotions-offline')).toBeTruthy());
    expect(ui.getByText('Promociones sin conexión')).toBeTruthy();
    await act(async () => {
      fireEvent.press(ui.getByTestId('promotions-retry'));
    });
    await waitFor(() => expect(ui.getByTestId('promotions-summary')).toBeTruthy());
    expect(getPromotions).toHaveBeenCalledTimes(2);
  });
});
