import { Link, router } from 'expo-router';
import { act, renderRouter } from 'expo-router/testing-library';
import { Text, View } from 'react-native';
import { fireEvent } from '@testing-library/react-native';

function FoundationIndex() {
  return (
    <View>
      <Link href="/technical-destination">Open technical destination</Link>
    </View>
  );
}

function TechnicalDestination() {
  return <Text>Technical destination</Text>;
}

describe('Foundation navigation', () => {
  it('navigates and returns using an in-memory Expo Router filesystem', async () => {
    const rendered = await renderRouter(
      {
        index: FoundationIndex,
        'technical-destination': TechnicalDestination,
      },
      { initialUrl: '/' },
    );

    await fireEvent.press(rendered.getByText('Open technical destination'));
    expect(rendered.getByText('Technical destination')).toBeTruthy();

    await act(async () => {
      router.back();
    });
    expect(rendered.getByText('Open technical destination')).toBeTruthy();
  });
});
