import { fireEvent, render } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { GuestNoticeProvider, useGuestNotice } from '@/modules/navigation';

function Probe() {
  const { dismissNotice, notice, showServiceRequestSuccess } = useGuestNotice();
  return <><Text testID="guest-notice-value">{notice?.type ?? 'none'}</Text><Pressable onPress={() => showServiceRequestSuccess()} testID="guest-notice-show" /><Pressable onPress={dismissNotice} testID="guest-notice-dismiss" /></>;
}

describe('GuestNoticeProvider', () => {
  it('keeps the success notice only in the active Guest presentation session', async () => {
    const ui = await render(<GuestNoticeProvider><Probe /></GuestNoticeProvider>);
    expect(ui.getByTestId('guest-notice-value').props.children).toBe('none');
    await fireEvent.press(ui.getByTestId('guest-notice-show'));
    expect(ui.getByTestId('guest-notice-value').props.children).toBe('SERVICE_REQUEST_SUCCESS');
    await fireEvent.press(ui.getByTestId('guest-notice-dismiss'));
    expect(ui.getByTestId('guest-notice-value').props.children).toBe('none');
  });
});
