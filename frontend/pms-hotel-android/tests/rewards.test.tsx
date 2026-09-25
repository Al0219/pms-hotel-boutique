import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Text, View } from 'react-native';

import { NetworkError } from '@/data/remote/http/HttpError';
import { AccountStayHubScreen } from '@/modules/account';
import { CheckoutSessionProvider } from '@/modules/checkout';
import { GuestNavigationMenuProvider, GuestNoticeProvider, GuestRootHeader } from '@/modules/navigation';
import { PromotionsScreen } from '@/modules/promotions/presentation/PromotionsScreen';
import { type RewardsFixtureDto } from '@/modules/rewards/data/dto/RewardsFixtureDto';
import { mapRewardsFixtureDto } from '@/modules/rewards/data/mappers/mapRewardsFixtureDto';
import { MockRewardsService } from '@/modules/rewards/data/mocks/MockRewardsService';
import { rewardsFixture } from '@/modules/rewards/data/mocks/rewardsFixture';
import { type RewardsService } from '@/modules/rewards/data/services/RewardsService';
import { RewardsScreen } from '@/modules/rewards/presentation/RewardsScreen';
import { getTierPresentation } from '@/modules/rewards/presentation/rewardTierPresentation';
import { SessionServiceRequestsProvider } from '@/modules/service-requests';
import { SessionVehiclesProvider } from '@/modules/valet';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { gcTime: 0, retry: false },
    },
  });
}

async function renderRewards(service: RewardsService) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <RewardsScreen service={service} />
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

function RewardsTestLayout() {
  const queryClient = createQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <GuestNavigationMenuProvider>
        <GuestNoticeProvider>
          <SessionServiceRequestsProvider>
            <CheckoutSessionProvider>
              <SessionVehiclesProvider>
                <Slot />
              </SessionVehiclesProvider>
            </CheckoutSessionProvider>
          </SessionServiceRequestsProvider>
        </GuestNoticeProvider>
      </GuestNavigationMenuProvider>
    </QueryClientProvider>
  );
}

function AccountRoute() {
  return <AccountStayHubScreen />;
}

function ServicesRoute() {
  return <View><GuestRootHeader title="Servicios" /><Text>Servicios</Text></View>;
}

function RewardsRoute() {
  return <RewardsScreen />;
}

function PromotionsRoute() {
  return <PromotionsScreen />;
}

describe('Rewards', () => {
  it('maps the approved presentation-only fixture without parsing values', () => {
    expect(mapRewardsFixtureDto(rewardsFixture)).toEqual({
      currentLevelText: 'Silver',
      progressText: '3 / 8 hacia Gold',
      activeBenefitsText: '3 beneficios activos',
      metrics: [
        { key: 'member-rate', label: '5% Member Rate', valueText: 'Activo' },
        { key: 'credit', label: 'Crédito', valueText: 'Q 150' },
        { key: 'late-checkout', label: 'Late checkout', valueText: '14:00' },
        { key: 'next-level', label: 'Próximo nivel', valueText: 'Gold' },
        { key: 'remaining-stays', label: 'Faltan', valueText: '5 estadías' },
        { key: 'eligible-nights', label: 'Noches elegibles', valueText: '5' },
      ],
    });
    expect(() => mapRewardsFixtureDto({ ...rewardsFixture, progressText: ' ' })).toThrow('progressText must not be blank');
  });

  it('uses distinct local treatments for Silver and Gold with a neutral fallback', () => {
    const silver = getTierPresentation('Silver');
    const gold = getTierPresentation('Gold');
    const fallback = getTierPresentation('Unexpected tier');

    expect(silver.testID).toBe('rewards-tier-silver');
    expect(gold.testID).toBe('rewards-tier-gold');
    expect(silver.cardStyle).not.toEqual(gold.cardStyle);
    expect(fallback.testID).toBe('rewards-tier-default');
  });

  it('returns fixture data through the mock service and propagates its errors', async () => {
    await expect(new MockRewardsService().getRewards()).resolves.toEqual(rewardsFixture);
    const failure = new Error('rewards failure');
    await expect(new MockRewardsService({ getRewards: async () => { throw failure; } }).getRewards()).rejects.toBe(failure);
  });

  it('renders loading while the query is unresolved', async () => {
    const pending = deferred<RewardsFixtureDto>();
    const ui = await renderRewards(new MockRewardsService({ getRewards: () => pending.promise }));

    expect(ui.getByTestId('rewards-loading')).toBeTruthy();
    expect(ui.getByText('Cargando Rewards')).toBeTruthy();
  });

  it('renders all approved summary values and the six metrics', async () => {
    const ui = await renderRewards(new MockRewardsService());

    await waitFor(() => expect(ui.getByTestId('rewards-tier-silver')).toBeTruthy());
    expect(ui.getByText('Silver')).toBeTruthy();
    expect(ui.getByText('3 / 8 hacia Gold')).toBeTruthy();
    expect(ui.getByText('3 beneficios activos')).toBeTruthy();
    expect(ui.getByTestId('rewards-metrics').children).toHaveLength(6);
    expect(ui.getByText('Q 150')).toBeTruthy();
    expect(ui.getByText('5 estadías')).toBeTruthy();
  });

  it('renders the Gold tier with its own presentation', async () => {
    const goldFixture = { ...rewardsFixture, currentLevelText: 'Gold' };
    const ui = await renderRewards(new MockRewardsService({ getRewards: async () => goldFixture }));

    await waitFor(() => expect(ui.getByTestId('rewards-tier-gold')).toBeTruthy());
    expect(ui.getAllByText('Gold')).not.toHaveLength(0);
    expect(ui.queryByTestId('rewards-tier-silver')).toBeNull();
    expect(ui.queryByText('Mis servicios')).toBeNull();
    expect(ui.queryByText('Ver servicios')).toBeNull();
    expect(ui.queryByTestId('rewards-promotions-cta')).toBeNull();
    expect(ui.queryByText('Ver promociones aplicables')).toBeNull();
  });

  it('renders a generic error and retries the real query', async () => {
    const getRewards = jest.fn<Promise<RewardsFixtureDto>, []>()
      .mockRejectedValueOnce(new Error('rewards unavailable'))
      .mockResolvedValueOnce(rewardsFixture);
    const ui = await renderRewards(new MockRewardsService({ getRewards }));

    await waitFor(() => expect(ui.getByTestId('rewards-error')).toBeTruthy());
    await act(async () => {
      fireEvent.press(ui.getByTestId('rewards-retry'));
    });
    await waitFor(() => expect(ui.getByTestId('rewards-tier-silver')).toBeTruthy());
    expect(getRewards).toHaveBeenCalledTimes(2);
  });

  it('renders NetworkError as offline and allows retry', async () => {
    const getRewards = jest.fn<Promise<RewardsFixtureDto>, []>()
      .mockRejectedValueOnce(new NetworkError('offline'))
      .mockResolvedValueOnce(rewardsFixture);
    const ui = await renderRewards(new MockRewardsService({ getRewards }));

    await waitFor(() => expect(ui.getByTestId('rewards-offline')).toBeTruthy());
    expect(ui.getByText('Rewards sin conexión')).toBeTruthy();
    await act(async () => {
      fireEvent.press(ui.getByTestId('rewards-retry'));
    });
    await waitFor(() => expect(ui.getByTestId('rewards-tier-silver')).toBeTruthy());
    expect(getRewards).toHaveBeenCalledTimes(2);
  });

  it('navigates from the Benefits drawer entry to Rewards and returns to Account', async () => {
    const ui = await renderRouter(
      {
        _layout: RewardsTestLayout,
        account: AccountRoute,
        services: ServicesRoute,
        'account/rewards': RewardsRoute,
        'account/promotions': PromotionsRoute,
      },
      { initialUrl: '/services' },
    );

    await waitFor(() => expect(ui.getByTestId('guest-root-header')).toBeTruthy());
    await act(async () => {
      fireEvent.press(ui.getByTestId('guest-navigation-menu-button'));
    });
    await act(async () => { fireEvent.press(ui.getByTestId('guest-navigation-drawer-section-benefits')); });
    await act(async () => {
      fireEvent.press(ui.getByTestId('guest-navigation-drawer-link-rewards'));
    });
    await waitFor(() => expect(ui.getByTestId('rewards-screen')).toBeTruthy());
    expect(ui.queryByTestId('guest-navigation-chat-fab')).toBeNull();
    expect(ui.queryByTestId('guest-navigation-tab-home')).toBeNull();
    expect(ui.queryByTestId('rewards-promotions-cta')).toBeNull();

    await act(async () => {
      fireEvent.press(ui.getByTestId('rewards-back'));
    });
    await waitFor(() => expect(ui.getByTestId('account-stay-hub-screen')).toBeTruthy());
    expect(ui.getByTestId('guest-navigation-tab-home').props.accessibilityState).toEqual({ disabled: false, selected: true });
  });

  it('opens Promotions directly from the drawer and backs safely to Account', async () => {
    const ui = await renderRouter(
      {
        _layout: RewardsTestLayout,
        account: AccountRoute,
        services: ServicesRoute,
        'account/rewards': RewardsRoute,
        'account/promotions': PromotionsRoute,
      },
      { initialUrl: '/services' },
    );

    await waitFor(() => expect(ui.getByTestId('guest-root-header')).toBeTruthy());
    await act(async () => {
      fireEvent.press(ui.getByTestId('guest-navigation-menu-button'));
    });
    await act(async () => { fireEvent.press(ui.getByTestId('guest-navigation-drawer-section-benefits')); });
    await act(async () => {
      fireEvent.press(ui.getByTestId('guest-navigation-drawer-link-promociones'));
    });
    await waitFor(() => expect(ui.getByTestId('promotions-screen')).toBeTruthy());
    expect(ui.queryByTestId('guest-navigation-tab-home')).toBeNull();

    await act(async () => {
      fireEvent.press(ui.getByTestId('promotions-back'));
    });
    await waitFor(() => expect(ui.getByTestId('account-stay-hub-screen')).toBeTruthy());
    expect(ui.getByTestId('guest-navigation-tab-home').props.accessibilityState).toEqual({ disabled: false, selected: true });
  });
});
