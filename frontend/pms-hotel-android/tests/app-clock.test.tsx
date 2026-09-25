import { fireEvent, render } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { currentStayFixture } from '@/modules/stay/data/mocks/currentStayFixture';
import { getFirstAvailableServiceDate, getMinimumServiceTime, getStayServiceDateWindow, isServiceWithinStayWindow } from '@/modules/service-requests';
import { AppClockProvider, appClockModes, appClockPresetParts, getAppClockPresetDate, useAppClock, type AppClockPresetMode } from '@/shared/time';
import { AppClockQaControl, formatAppClockDate, formatAppClockTime } from '@/shared/time/AppClockQaControl';

const presetModes = appClockModes.filter((mode): mode is AppClockPresetMode => mode !== 'SYSTEM' && mode !== 'CUSTOM');

function ClockProbe() {
  const clock = useAppClock();
  const now = clock.getNow();
  return <>
    <Text testID="clock-mode">{clock.mode}</Text>
    <Text testID="clock-value">{now.getTime()}</Text>
    <Pressable onPress={() => clock.setMode('CHECKOUT_DAY')} testID="clock-checkout-day"><Text>Checkout</Text></Pressable>
    <Pressable onPress={() => clock.setCustomDate(new Date(2026, 8, 7, 16, 45))} testID="clock-custom"><Text>Custom</Text></Pressable>
  </>;
}

describe('AppClock', () => {
  it('constructs every fixed preset as the requested local date and time', () => {
    expect(presetModes).toHaveLength(6);
    for (const mode of presetModes) {
      const date = getAppClockPresetDate(mode);
      const expected = appClockPresetParts[mode];
      expect({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        seconds: date.getSeconds(),
        milliseconds: date.getMilliseconds(),
      }).toEqual({ ...expected, seconds: 0, milliseconds: 0 });
    }
  });

  it('uses a live system Date for SYSTEM without changing the device clock', async () => {
    const before = Date.now();
    const rendered = await render(<AppClockProvider><ClockProbe /></AppClockProvider>);
    const value = Number(rendered.getByTestId('clock-value').props.children);
    const after = Date.now();
    expect(rendered.getByTestId('clock-mode').props.children).toBe('SYSTEM');
    expect(value).toBeGreaterThanOrEqual(before);
    expect(value).toBeLessThanOrEqual(after);
  });

  it('switches between a preset and a manually selected local custom date', async () => {
    const rendered = await render(<AppClockProvider initialMode="IN_STAY"><ClockProbe /></AppClockProvider>);
    expect(Number(rendered.getByTestId('clock-value').props.children)).toBe(new Date(2026, 8, 11, 10, 0).getTime());

    await fireEvent.press(rendered.getByTestId('clock-checkout-day'));
    expect(rendered.getByTestId('clock-mode').props.children).toBe('CHECKOUT_DAY');
    expect(Number(rendered.getByTestId('clock-value').props.children)).toBe(new Date(2026, 8, 18, 9, 0).getTime());

    await fireEvent.press(rendered.getByTestId('clock-custom'));
    expect(rendered.getByTestId('clock-mode').props.children).toBe('CUSTOM');
    expect(Number(rendered.getByTestId('clock-value').props.children)).toBe(new Date(2026, 8, 7, 16, 45).getTime());
  });

  it('shows and preserves locally selected Custom date and time values', async () => {
    const rendered = await render(<AppClockProvider initialCustomDate={new Date(2026, 8, 18, 10, 59)} initialMode="CUSTOM"><AppClockQaControl /></AppClockProvider>);
    await fireEvent.press(rendered.getByTestId('app-clock-qa-open'));
    expect(rendered.getByTestId('app-clock-custom-date').props.accessibilityLabel).toBe('Fecha: 18/09/2026');
    expect(rendered.getByTestId('app-clock-custom-time').props.accessibilityLabel).toBe('Hora: 10:59');

    await fireEvent.press(rendered.getByTestId('app-clock-custom-date'));
    await fireEvent(rendered.getByTestId('app-clock-date-picker'), 'onValueChange', { nativeEvent: { timestamp: new Date(2026, 8, 19).getTime(), utcOffset: 0 } }, new Date(2026, 8, 19));
    expect(rendered.getByTestId('app-clock-custom-date').props.accessibilityLabel).toBe('Fecha: 19/09/2026');
    expect(rendered.getByTestId('app-clock-custom-time').props.accessibilityLabel).toBe('Hora: 10:59');

    await fireEvent.press(rendered.getByTestId('app-clock-custom-date'));
    await fireEvent(rendered.getByTestId('app-clock-date-picker'), 'onDismiss');
    expect(rendered.getByTestId('app-clock-custom-date').props.accessibilityLabel).toBe('Fecha: 19/09/2026');

    await fireEvent.press(rendered.getByTestId('app-clock-custom-time'));
    expect(rendered.getByTestId('app-clock-time-picker-hour-10').props.accessibilityState.selected).toBe(true);
    expect(rendered.getByTestId('app-clock-time-picker-minute-59').props.accessibilityState.selected).toBe(true);
    await fireEvent.press(rendered.getByTestId('app-clock-time-picker-hour-23'));
    await fireEvent.press(rendered.getByTestId('app-clock-time-picker-minute-58'));
    await fireEvent.press(rendered.getByTestId('app-clock-time-picker-confirm'));
    expect(rendered.getByTestId('app-clock-custom-time').props.accessibilityLabel).toBe('Hora: 23:58');
  });

  it('formats AppClock values locally without UTC conversion', () => {
    const value = new Date(2026, 8, 18, 10, 59);
    expect(formatAppClockDate(value)).toBe('18/09/2026');
    expect(formatAppClockTime(value)).toBe('10:59');
  });

  it('proves the fixed stay boundaries and the checkout thirty-minute restriction', () => {
    expect(currentStayFixture.arrival).toBe('2026-08-28');
    expect(currentStayFixture.departure).toBe('2026-09-18');
    const arrival = '2026-08-28';
    const departure = '2026-09-18';

    const beforeCheckin = getAppClockPresetDate('BEFORE_CHECKIN');
    const inStay = getAppClockPresetDate('IN_STAY');
    const checkoutDay = getAppClockPresetDate('CHECKOUT_DAY');
    const checkoutCutoff = getAppClockPresetDate('CHECKOUT_CUTOFF');
    const afterStay = getAppClockPresetDate('AFTER_STAY');

    expect(beforeCheckin.getTime()).toBeLessThan(new Date(2026, 7, 28, 0, 0).getTime());
    expect(getStayServiceDateWindow(arrival, departure, inStay.getTime())).toEqual({ minimumDate: '2026-09-11', maximumDate: departure });
    expect(checkoutDay.getDate()).toBe(18);
    expect(checkoutDay.getHours()).toBeLessThan(12);
    expect(isServiceWithinStayWindow({ arrival, departure, nowMs: checkoutDay.getTime(), serviceDate: departure, startTime: '11:00' })).toBe(true);

    expect(getMinimumServiceTime(checkoutCutoff.getTime())).toBe(new Date(2026, 8, 18, 12, 1).getTime());
    expect(getFirstAvailableServiceDate(checkoutCutoff.getTime(), ['11:59', '12:00'], arrival, departure)).toBeNull();
    expect(isServiceWithinStayWindow({ arrival, departure, nowMs: checkoutCutoff.getTime(), serviceDate: departure, startTime: '12:00' })).toBe(false);
    expect(getStayServiceDateWindow(arrival, departure, afterStay.getTime())).toBeNull();
  });
});
