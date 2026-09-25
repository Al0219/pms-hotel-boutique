import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { createCircularTimeValues, normalizeCircularIndex, TimeWheelPicker } from '@/shared/components/TimeWheelPicker';

describe('TimeWheelPicker', () => {
  it('normalizes repeated hour and minute positions across the circular boundary', () => {
    expect([22, 23, 24, 25].map((index) => normalizeCircularIndex(index, 24))).toEqual([22, 23, 0, 1]);
    expect([1, 0, -1, -2].map((index) => normalizeCircularIndex(index, 24))).toEqual([1, 0, 23, 22]);
    expect([58, 59, 60, 61].map((index) => normalizeCircularIndex(index, 60))).toEqual([58, 59, 0, 1]);
    expect(createCircularTimeValues(24)).toHaveLength(72);
    expect(createCircularTimeValues(60)).toHaveLength(180);
  });

  it('keeps a disabled full time visible but prevents confirmation, while cancel preserves the external value', async () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    const ui = await render(<TimeWheelPicker isValueDisabled={(value) => value !== '10:00'} mode="time" onCancel={onCancel} onConfirm={onConfirm} testID="wheel" title="Elegir hora" value="10:00" visible />);
    await fireEvent(ui.getByTestId('wheel-hours'), 'onMomentumScrollEnd', { nativeEvent: { contentOffset: { y: 72 * 48 } } });
    expect(ui.getByTestId('wheel-confirm').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(ui.getByTestId('wheel-confirm'));
    expect(onConfirm).not.toHaveBeenCalled();
    await fireEvent.press(ui.getByTestId('wheel-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('keeps logical selections after an outer-copy recenter instead of resetting them to zero', async () => {
    const onConfirm = jest.fn();
    const ui = await render(<TimeWheelPicker mode="time" onCancel={jest.fn()} onConfirm={onConfirm} testID="wheel" title="Elegir hora" value="10:37" visible />);

    await fireEvent(ui.getByTestId('wheel-hours'), 'onMomentumScrollEnd', { nativeEvent: { contentOffset: { y: 18 * 48 } } });
    await fireEvent(ui.getByTestId('wheel-minutes'), 'onMomentumScrollEnd', { nativeEvent: { contentOffset: { y: 45 * 48 } } });
    await fireEvent.press(ui.getByTestId('wheel-confirm'));

    expect(onConfirm).toHaveBeenCalledWith('18:45');
  });

  it('wraps forward and backward for both logical wheels', async () => {
    const onConfirm = jest.fn();
    const ui = await render(<TimeWheelPicker mode="time" onCancel={jest.fn()} onConfirm={onConfirm} testID="wheel" title="Elegir hora" value="23:59" visible />);

    await fireEvent(ui.getByTestId('wheel-hours'), 'onMomentumScrollEnd', { nativeEvent: { contentOffset: { y: 48 * 48 } } });
    await fireEvent(ui.getByTestId('wheel-minutes'), 'onMomentumScrollEnd', { nativeEvent: { contentOffset: { y: 120 * 48 } } });
    await fireEvent.press(ui.getByTestId('wheel-confirm'));
    expect(onConfirm).toHaveBeenCalledWith('00:00');

    const reverse = jest.fn();
    const backward = await render(<TimeWheelPicker mode="time" onCancel={jest.fn()} onConfirm={reverse} testID="backward" title="Elegir hora" value="00:00" visible />);
    await fireEvent(backward.getByTestId('backward-hours'), 'onMomentumScrollEnd', { nativeEvent: { contentOffset: { y: 23 * 48 } } });
    await fireEvent(backward.getByTestId('backward-minutes'), 'onMomentumScrollEnd', { nativeEvent: { contentOffset: { y: 59 * 48 } } });
    await fireEvent.press(backward.getByTestId('backward-confirm'));
    expect(reverse).toHaveBeenCalledWith('23:59');
  });

  it('synchronizes a new external value without replacing it with zero', async () => {
    const onConfirm = jest.fn();
    const ui = await render(<TimeWheelPicker mode="time" onCancel={jest.fn()} onConfirm={onConfirm} testID="wheel" title="Elegir hora" value="10:59" visible />);
    await act(async () => {
      ui.rerender(<TimeWheelPicker mode="time" onCancel={jest.fn()} onConfirm={onConfirm} testID="wheel" title="Elegir hora" value="13:25" visible />);
    });
    await waitFor(() => expect(ui.getByTestId('wheel-hour-13').props.accessibilityState.selected).toBe(true));
    await fireEvent.press(ui.getByTestId('wheel-confirm'));
    expect(onConfirm).toHaveBeenCalledWith('13:25');
  });
});
