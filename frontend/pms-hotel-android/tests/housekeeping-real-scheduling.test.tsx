import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, userEvent, waitFor, within } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { nativeGuestClient } from '@/modules/guest-auth/data/http/NativeGuestClient';
import { GuestAuthSessionProvider } from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import { ActiveReservationContextProvider } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { SessionServiceRequestsProvider, getNearestServiceTime, isServiceWithinStayWindow, getFirstAvailableServiceDate } from '@/modules/service-requests';
import { HousekeepingScreen } from '@/modules/services/housekeeping/presentation/HousekeepingScreen';
import { housekeepingQaTimeSlots } from '@/modules/services/housekeeping/presentation/housekeepingQaOptions';
import { currentStayFixture } from '@/modules/stay/data/mocks/currentStayFixture';
import { propertyDateTimeMs } from '@/shared/time/propertyTime';
jest.mock('@/config/environment', () => ({ environment: { useMockApi: false } }));
jest.mock('expo-router', () => ({ ...jest.requireActual('expo-router'), router: { replace: jest.fn(), dismissTo: jest.fn() }, useLocalSearchParams: jest.fn(() => ({})), useFocusEffect: jest.fn() }));
const timezone = 'America/Guatemala';
const context = { reservationId: 'own', reservationStayId: 'own-stay' };
const row = { id: 'request', reservationId: 'own', stayId: 'own-stay', serviceDate: '2030-01-02', timeSlot: '09:00–10:00', cleaningType: 'FULL_CLEANING', notes: 'Original', status: 'OPEN', createdAt: '2030-01-01T00:00:00Z', updatedAt: '2030-01-01T00:00:00Z', modifiableUntil: '2030-01-02T14:35:00Z' };
const at = (time: string) => Date.parse(`2030-01-02T${time}Z`);
async function setup(now = at('14:45:00'), edit = false, zone = timezone, departure = '2030-01-04') {
 (useLocalSearchParams as jest.Mock).mockReturnValue(edit ? { editRequestId: row.id } : {});
 const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
 const stayService = { getCurrentStay: async () => ({ ...currentStayFixture, ...context, id: context.reservationStayId, timezone: zone, arrival: '2030-01-01', departure }) };
 const ui = await render(<QueryClientProvider client={client}><GuestAuthSessionProvider initialSession={{ accountId: 'guest' }}><ActiveReservationContextProvider initialActiveReservationContext={context}><SessionServiceRequestsProvider><HousekeepingScreen stayService={stayService} nowMs={() => now} /></SessionServiceRequestsProvider></ActiveReservationContextProvider></GuestAuthSessionProvider></QueryClientProvider>);
 await waitFor(() => expect(ui.getByTestId('housekeeping-submit')).toBeTruthy());
 return ui;
}
beforeEach(() => jest.spyOn(nativeGuestClient, 'request').mockResolvedValue([row]));
afterEach(() => jest.restoreAllMocks());
it.each([['14:00:00', '09:00–10:00', true], ['14:45:00','09:00–10:00',false], ['14:45:00','10:00–11:00',true], ['19:00:00','14:00–15:00',true]])('validates property-local lead time at %s for %s', (time, slot, allowed) => {
 expect(isServiceWithinStayWindow({ arrival: '2030-01-01', departure: '2030-01-04', serviceDate: '2030-01-02', startTime: slot, timezone, nowMs: at(time) })).toBe(allowed);
});
it('uses IANA offsets and dates independently of the device calendar, including seasonal changes', () => {
 expect(propertyDateTimeMs('2030-01-02','09:00',timezone)).toBe(at('15:00:00'));
 expect(propertyDateTimeMs('2030-07-02','09:00','America/New_York')).toBe(Date.parse('2030-07-02T13:00:00Z'));
 expect(getFirstAvailableServiceDate(Date.parse('2030-01-03T01:00:00Z'),housekeepingQaTimeSlots,'2030-01-01','2030-01-04',undefined,timezone)).toBe('2030-01-03');
 expect(getNearestServiceTime('2030-01-03',housekeepingQaTimeSlots,at('19:00:00'),'14:00–15:00','2030-01-01','2030-01-04',undefined,timezone)).toBe('14:00–15:00');
});
it('shows five real options, preserves default10, disables passed slots and retains FULL_CLEANING only', async () => {
 const ui=await setup();expect(within(ui.getByTestId('housekeeping-time-selector')).getByText('10:00–11:00')).toBeTruthy();
 await fireEvent.press(ui.getByTestId('housekeeping-time-selector'));
 for(const slot of housekeepingQaTimeSlots) expect(ui.getByTestId(`housekeeping-time-picker-option-${slot}`).props.accessibilityState.disabled).toBe(slot==='09:00–10:00');
 await fireEvent.press(ui.getByTestId('housekeeping-time-picker-cancel'));
 await fireEvent.press(ui.getByTestId('housekeeping-type-selector'));expect(ui.queryByTestId('housekeeping-type-option-LIGHT_CLEANING')).toBeNull();
});
it('allows future dates, retains valid selection and replaces a slot that exceeds checkout', async () => {
 const ui=await setup(at('19:00:00'));await waitFor(() => expect(within(ui.getByTestId('housekeeping-time-selector')).getByText('14:00–15:00')).toBeTruthy());
 const user = userEvent.setup();
 async function date(day:string) { await user.press(ui.getByTestId('housekeeping-date-selector'));await user.press(ui.getByTestId(`housekeeping-date-picker-day-${day}`));await user.press(ui.getByTestId('housekeeping-date-picker-confirm')); }
 await date('2030-01-03');expect(within(ui.getByTestId('housekeeping-time-selector')).getByText('14:00–15:00')).toBeTruthy();
 await fireEvent.press(ui.getByTestId('housekeeping-time-selector'));
 for (const slot of housekeepingQaTimeSlots) expect(ui.getByTestId(`housekeeping-time-picker-option-${slot}`).props.accessibilityState.disabled).toBe(false);
 await fireEvent.press(ui.getByTestId('housekeeping-time-picker-cancel'));
 await date('2030-01-04');await waitFor(() => expect(within(ui.getByTestId('housekeeping-time-selector')).getByText('09:00–10:00')).toBeTruthy());
 await fireEvent.press(ui.getByTestId('housekeeping-time-selector'));
 for(const slot of ['12:00–13:00','14:00–15:00']) expect(ui.getByTestId(`housekeeping-time-picker-option-${slot}`).props.accessibilityState.disabled).toBe(true);
});
it('preloads9 and sends an HTTP update to14 with the same ID and original version', async () => {
 const ui=await setup(at('14:00:00'),true);expect(within(ui.getByTestId('housekeeping-time-selector')).getByText('09:00–10:00')).toBeTruthy();
 await fireEvent.press(ui.getByTestId('housekeeping-time-selector'));await fireEvent.press(ui.getByTestId('housekeeping-time-picker-option-14:00–15:00'));await fireEvent.press(ui.getByTestId('housekeeping-time-picker-confirm'));
 (nativeGuestClient.request as jest.Mock).mockImplementation(async (_path, options) => options?.method==='PUT'?{...row,timeSlot:'14:00–15:00',updatedAt:'2030-01-02T14:01:00Z',modifiableUntil:'2030-01-02T19:35:00Z'}:[row]);
 await fireEvent.press(ui.getByTestId('housekeeping-submit'));await waitFor(()=>expect(ui.getByTestId('housekeeping-submit-success')).toBeTruthy());
 expect(nativeGuestClient.request).toHaveBeenCalledWith(expect.stringContaining('/housekeeping-requests/request'),expect.objectContaining({method:'PUT',body:JSON.stringify({ serviceDate:row.serviceDate,timeSlot:'14:00–15:00',cleaningType:row.cleaningType,notes:row.notes,expectedUpdatedAt:row.updatedAt })}));
});
it('fails closed when timezone metadata is absent or there are no valid slots before checkout', async () => {
 const ui=await setup(at('17:45:00'),false,timezone,'2030-01-02');expect(ui.getByTestId('housekeeping-submit').props.accessibilityState.disabled).toBe(true);expect(ui.getByTestId('housekeeping-no-availability')).toBeTruthy();
 await ui.unmount();const missing=await setup(at('14:00:00'),false,'');expect(missing.getByTestId('housekeeping-submit').props.accessibilityState.disabled).toBe(true);
});
