import { fireEvent, render } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';

import { NetworkError } from '@/data/remote/http/HttpError';
import { mapLinkedReservationSummaryDto } from '@/modules/guest-auth/data/mappers/mapLinkedReservationSummaryDto';
import { MockGuestAccountService } from '@/modules/guest-auth/data/mocks/MockGuestAccountService';
import { MockGuestAuthService } from '@/modules/guest-auth/data/mocks/MockGuestAuthService';
import { MockLinkedReservationsService } from '@/modules/guest-auth/data/mocks/MockLinkedReservationsService';
import { InvalidGuestCredentialsError } from '@/modules/guest-auth/domain/errors/InvalidGuestCredentialsError';
import { resolveLinkedReservationOutcome } from '@/modules/guest-auth/domain/resolveLinkedReservationOutcome';
import { ActiveReservationContextProvider, useActiveReservationContext } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { GuestAuthSessionProvider, useGuestAuthSession } from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import { reservationContextKey } from '@/modules/guest-auth/presentation/queryKeys';

const oneReservation = {
  reservationId: 'HB-2026-004281',
  reservationStayId: 'stay-2026-004281',
  reference: 'HB-2026-004281',
  arrival: '2026-08-28',
  departure: '2026-09-18',
  roomLabel: '204',
};

const multipleReservations = [
  oneReservation,
  {
    reservationId: 'HB-2026-004282',
    reservationStayId: 'stay-2026-004282',
    reference: 'HB-2026-004282',
    arrival: '2026-10-02',
    departure: '2026-10-06',
    roomLabel: null,
  },
];

function AuthProbe() {
  const { beginSession, clearSession, session } = useGuestAuthSession();
  return <View>
    <Text testID="auth-session">{session?.accountId ?? 'none'}</Text>
    <Pressable testID="auth-begin" onPress={() => beginSession({ accountId: 'guest-account-next' })}><Text>Begin</Text></Pressable>
    <Pressable testID="auth-clear" onPress={clearSession}><Text>Clear</Text></Pressable>
  </View>;
}

function ContextProbe() {
  const { activeReservationContext, clearActiveReservationContext, setActiveReservationContext } = useActiveReservationContext();
  return <View>
    <Text testID="reservation-context">{activeReservationContext ? `${activeReservationContext.reservationId}/${activeReservationContext.reservationStayId}` : 'none'}</Text>
    <Pressable testID="context-set" onPress={() => setActiveReservationContext({ reservationId: 'reservation-first', reservationStayId: 'stay-first' })}><Text>Set</Text></Pressable>
    <Pressable testID="context-replace" onPress={() => setActiveReservationContext({ reservationId: 'reservation-next', reservationStayId: 'stay-next' })}><Text>Replace</Text></Pressable>
    <Pressable testID="context-clear" onPress={clearActiveReservationContext}><Text>Clear</Text></Pressable>
  </View>;
}

describe('Guest Auth + Reservation Context foundation', () => {
  it('keeps a GuestAuthSession limited to the account identity and resolves the canonical GuestAccount through its boundary', async () => {
    const session = await new MockGuestAuthService().login({ email: ' GUEST@EXAMPLE.COM ', password: 'guest-demo-password' });
    expect(session).toEqual({ accountId: 'guest-account-primary' });
    expect(session).not.toHaveProperty('password');
    expect(session).not.toHaveProperty('reservationId');
    expect(session).not.toHaveProperty('stayId');

    await expect(new MockGuestAccountService().getCurrent(session)).resolves.toMatchObject({ key: 'guest-account-primary', displayName: 'Sofía Morales' });
    await expect(new MockGuestAccountService().getCurrent({ accountId: 'another-account' })).rejects.toThrow('Guest account is unavailable');
  });

  it.each([
    ['invalid credentials', new MockGuestAuthService({ scenario: { kind: 'invalid-credentials' } }), InvalidGuestCredentialsError],
    ['generic error', new MockGuestAuthService({ scenario: { kind: 'error' } }), Error],
    ['offline', new MockGuestAuthService({ scenario: { kind: 'offline' } }), NetworkError],
  ])('models %s without credentials in the session', async (_name, service, ErrorType) => {
    await expect(service.login({ email: 'guest@example.com', password: 'guest-demo-password' })).rejects.toBeInstanceOf(ErrorType);
  });

  it('maps only the narrow linked-reservation selection projection', () => {
    const summary = mapLinkedReservationSummaryDto(oneReservation);
    expect(summary).toEqual(oneReservation);
    expect(summary).not.toHaveProperty('services');
    expect(summary).not.toHaveProperty('checkout');
    expect(summary).not.toHaveProperty('invoice');
  });

  it.each([
    ['zero', [], 0],
    ['one', [oneReservation], 1],
    ['multiple', multipleReservations, 2],
  ])('supports the %s linked reservations fixture scenario', async (_name, reservations, expectedCount) => {
    const service = new MockLinkedReservationsService({ scenario: { kind: 'success', reservations } });
    await expect(service.listForAccount('guest-account-primary')).resolves.toHaveLength(expectedCount);
  });

  it.each([
    ['error', new MockLinkedReservationsService({ scenario: { kind: 'error' } }), Error],
    ['offline', new MockLinkedReservationsService({ scenario: { kind: 'offline' } }), NetworkError],
  ])('surfaces linked-reservation %s through the service boundary', async (_name, service, ErrorType) => {
    await expect(service.listForAccount('guest-account-primary')).rejects.toBeInstanceOf(ErrorType);
  });

  it('resolves zero, one, and multiple reservations without navigating or mutating state', () => {
    const mappedOne = mapLinkedReservationSummaryDto(oneReservation);
    const mappedMultiple = multipleReservations.map(mapLinkedReservationSummaryDto);
    expect(resolveLinkedReservationOutcome([])).toEqual({ kind: 'EMPTY' });
    expect(resolveLinkedReservationOutcome([mappedOne])).toEqual({ kind: 'AUTO_SELECT', context: { reservationId: 'HB-2026-004281', reservationStayId: 'stay-2026-004281' } });
    expect(resolveLinkedReservationOutcome(mappedMultiple)).toEqual({ kind: 'REQUIRES_SELECTION' });
  });

  it('keeps Auth Session state in memory and clears it explicitly', async () => {
    const screen = await render(<GuestAuthSessionProvider><AuthProbe /></GuestAuthSessionProvider>);
    expect(screen.getByTestId('auth-session').props.children).toBe('none');
    await fireEvent.press(screen.getByTestId('auth-begin'));
    expect(screen.getByTestId('auth-session').props.children).toBe('guest-account-next');
    await fireEvent.press(screen.getByTestId('auth-clear'));
    expect(screen.getByTestId('auth-session').props.children).toBe('none');
  });

  it('sets, replaces, and clears only an ActiveReservationContext identity', async () => {
    const screen = await render(<ActiveReservationContextProvider><ContextProbe /></ActiveReservationContextProvider>);
    expect(screen.getByTestId('reservation-context').props.children).toBe('none');
    await fireEvent.press(screen.getByTestId('context-set'));
    expect(screen.getByTestId('reservation-context').props.children).toBe('reservation-first/stay-first');
    await fireEvent.press(screen.getByTestId('context-replace'));
    expect(screen.getByTestId('reservation-context').props.children).toBe('reservation-next/stay-next');
    await fireEvent.press(screen.getByTestId('context-clear'));
    expect(screen.getByTestId('reservation-context').props.children).toBe('none');
  });

  it('declares the future context-aware query key without migrating current Stay consumers', () => {
    expect(reservationContextKey({ reservationId: 'reservation-1', reservationStayId: 'stay-1' })).toEqual(['stay', 'reservation-1', 'stay-1']);
  });
});
