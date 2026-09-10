import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { act, renderRouter } from 'expo-router/testing-library';
import { router } from 'expo-router';
import { Text } from 'react-native';

import { NetworkError } from '@/data/remote/http/HttpError';
import { type ReservationStayDto } from '@/modules/stay/data/dtos/ReservationStayDto';
import { currentStayFixture } from '@/modules/stay/data/mocks/currentStayFixture';
import { MockStayService } from '@/modules/stay/data/mocks/MockStayService';
import { StayHomeScreen } from '@/modules/stay/presentation/StayHomeScreen';

async function renderStayHome(service: MockStayService) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <StayHomeScreen service={service} />
    </QueryClientProvider>,
  );
}

describe('Stay Home', () => {
  it('renders mapped ReservationStay content, its opaque status, and the approved Figma actions', async () => {
    const rendered = await renderStayHome(new MockStayService({ kind: 'success', dto: currentStayFixture }));

    await waitFor(() => expect(rendered.getByTestId('stay-home-screen')).toBeTruthy());

    expect(rendered.getByText('Habitación 204 · 28 ago–31 ago')).toBeTruthy();
    expect(rendered.getByText('Deluxe King')).toBeTruthy();
    expect(rendered.getByText('HB-2026-004281')).toBeTruthy();
    expect(rendered.getByTestId('stay-status').props.children).toBe('REMOTE_STATUS');
    expect(rendered.getByText('Limpieza')).toBeTruthy();
    expect(rendered.getByText('Room service')).toBeTruthy();
    expect(rendered.getByText('Amenidades')).toBeTruthy();
    expect(rendered.getByText('Información')).toBeTruthy();
    expect(rendered.getByText('Solicitud en curso')).toBeTruthy();
    expect(rendered.getByText('Pendiente')).toBeTruthy();
    expect(rendered.getByLabelText('Inicio').props.accessibilityState).toEqual({
      disabled: true,
      selected: true,
    });
    expect(rendered.getByLabelText('Solicitudes').props.accessibilityState).toEqual({
      disabled: true,
      selected: false,
    });
    await rendered.unmount();
  });

  it('renders the unassigned-room state without inventing a room', async () => {
    const unassignedStay: ReservationStayDto = { ...currentStayFixture, room: null };
    const rendered = await renderStayHome(new MockStayService({ kind: 'success', dto: unassignedStay }));

    await waitFor(() => expect(rendered.getByText('Habitación por asignar · 28 ago–31 ago')).toBeTruthy());

    expect(rendered.queryByText('Habitación 204')).toBeNull();
    await rendered.unmount();
  });

  it('renders explicit offline and generic error states from the service boundary', async () => {
    const offline = await renderStayHome(
      new MockStayService({ kind: 'error', error: new NetworkError('offline mock') }),
    );
    await waitFor(() => expect(offline.getByTestId('stay-home-offline')).toBeTruthy());
    await offline.unmount();

    const failure = await renderStayHome(
      new MockStayService({ kind: 'error', error: new Error('remote mock failure') }),
    );
    await waitFor(() => expect(failure.getByTestId('stay-home-error')).toBeTruthy());
    expect(failure.getByText('remote mock failure')).toBeTruthy();
    await failure.unmount();
  });

  it('navigates to the technical services handoff and returns to Stay Home', async () => {
    const StayRoute = () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } });
      return (
        <QueryClientProvider client={queryClient}>
          <StayHomeScreen service={new MockStayService({ kind: 'success', dto: currentStayFixture })} />
        </QueryClientProvider>
      );
    };
    const ServicesRoute = () => <Text>Technical services handoff</Text>;
    const rendered = await renderRouter({ index: StayRoute, services: ServicesRoute }, { initialUrl: '/' });

    await waitFor(() => expect(rendered.getByLabelText('Limpieza')).toBeTruthy());
    await fireEvent.press(rendered.getByLabelText('Limpieza'));
    expect(rendered.getByText('Technical services handoff')).toBeTruthy();

    await act(async () => {
      router.back();
    });
    await waitFor(() => expect(rendered.getByTestId('stay-home-screen')).toBeTruthy());
  });
});
