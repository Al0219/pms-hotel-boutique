import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';

import { ServiceDatePicker } from '@/shared/components';
import { formatGuestDate } from '@/shared/components/ServiceDatePicker';

afterEach(cleanup);
function Harness({ enabled }: { enabled?: (date: Date) => boolean }) {
  const [value, setValue] = useState('2026-09-18');
  const [visible, setVisible] = useState(true);
  return <><Text testID="value">{value}</Text><ServiceDatePicker isDateEnabled={enabled} maximumDate={new Date(2026, 9, 10)} minimumDate={new Date(2026, 8, 10)} onCancel={() => setVisible(false)} onConfirm={(next) => { setValue(next); setVisible(false); }} testID="guest-date-picker" value={value} visible={visible} /></>;
}

describe('ServiceDatePicker', () => {
  it('opens with the confirmed local date selected and formats it DD/MM/YYYY', async () => { const ui = await render(<Harness />); expect(ui.getByTestId('guest-date-picker-day-2026-09-18').props.accessibilityState.selected).toBe(true); expect(formatGuestDate('2026-09-18')).toBe('18/09/2026'); });
  it('keeps the confirmed date on cancel and backdrop', async () => { const ui = await render(<Harness />); await fireEvent.press(ui.getByTestId('guest-date-picker-day-2026-09-20')); await fireEvent.press(ui.getByTestId('guest-date-picker-cancel')); expect(ui.getByTestId('value')).toHaveTextContent('2026-09-18'); });
  it('keeps the confirmed date when the backdrop closes the sheet', async () => { const ui = await render(<Harness />); await fireEvent.press(ui.getByTestId('guest-date-picker-day-2026-09-20')); await fireEvent.press(ui.getByTestId('guest-date-picker-backdrop')); expect(ui.getByTestId('value')).toHaveTextContent('2026-09-18'); });
  it('updates the confirmed date only on accept', async () => { const ui = await render(<Harness />); await fireEvent.press(ui.getByTestId('guest-date-picker-day-2026-09-20')); await fireEvent.press(ui.getByTestId('guest-date-picker-confirm')); expect(ui.getByTestId('value')).toHaveTextContent('2026-09-20'); });
  it('does not allow disabled dates and navigates only to an enabled month', async () => { const ui = await render(<Harness enabled={(date) => date.getDate() !== 19} />); expect(ui.getByTestId('guest-date-picker-day-2026-09-19').props.accessibilityState.disabled).toBe(true); await fireEvent.press(ui.getByTestId('guest-date-picker-day-2026-09-19')); expect(ui.getByTestId('guest-date-picker-day-2026-09-18').props.accessibilityState.selected).toBe(true); await fireEvent.press(ui.getByTestId('guest-date-picker-next-month')); expect(ui.getByText(/octubre.*2026/i)).toBeTruthy(); });
});
