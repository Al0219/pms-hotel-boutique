import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { router } from 'expo-router';
import { Keyboard, Text } from 'react-native';

import { NetworkError } from '@/data/remote/http/HttpError';
import {
  ChatScreen,
  mapChatConversationFixtureDto,
  MockChatService,
} from '@/modules/chat';
import { chatConversationFixture } from '@/data/mocks/chat/chatConversationFixture';
import { GuestChildHeader } from '@/modules/navigation';
import { SessionServiceRequestsProvider, useSessionServiceRequests } from '@/modules/service-requests';

declare const require: (moduleName: string) => { readFileSync(path: string, encoding: string): string };

function createDeferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve: resolve! };
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { gcTime: 0, retry: false }, mutations: { retry: false } },
  });
}

function RequestProbe() {
  const { requests } = useSessionServiceRequests();
  return <Text testID="session-service-requests-probe">{JSON.stringify(requests)}</Text>;
}

async function renderChat(service: MockChatService) {
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}><SessionServiceRequestsProvider><RequestProbe /><ChatScreen service={service} /></SessionServiceRequestsProvider></QueryClientProvider>,
  );
}

async function waitForChat(rendered: Awaited<ReturnType<typeof render>>) {
  await waitFor(() => expect(rendered.getByTestId('chat-screen')).toBeTruthy());
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Chat con Recepción', () => {
  it('maps the approved fixture DTO to domain with only guest and reception authors', () => {
    expect(mapChatConversationFixtureDto(chatConversationFixture)).toEqual({
      context: chatConversationFixture.context,
      messages: [
        { key: 'chat-message-reception-01', author: 'reception', text: 'Hola María, ¿en qué podemos ayudarte?' },
        { key: 'chat-message-guest-01', author: 'guest', text: 'Necesito un taxi mañana a las 6:00.' },
        { key: 'chat-message-reception-02', author: 'reception', text: 'Claro. ¿Destino Aeropuerto La Aurora?' },
        { key: 'chat-message-guest-02', author: 'guest', text: 'Sí, por favor.' },
        {
          key: 'chat-message-reception-03',
          author: 'reception',
          text: 'Listo. Solicitud #4832 creada · salida 06:00.',
          serviceAssignment: {
            assignmentKey: 'chat-assignment-transfer-01',
            title: 'Traslado al aeropuerto',
            summary: 'Asignado por Recepción',
          },
        },
      ],
    });
  });

  it('registers only structured hotel assignments once and leaves normal messages out of session requests', async () => {
    const assigned = await renderChat(new MockChatService());
    await waitFor(() => expect(JSON.parse(assigned.getByTestId('session-service-requests-probe').props.children)).toHaveLength(1));
    expect(JSON.parse(assigned.getByTestId('session-service-requests-probe').props.children)).toEqual([
      expect.objectContaining({ kind: 'HOTEL_ASSIGNED', origin: 'CHAT', status: 'ASSIGNED', title: 'Traslado al aeropuerto', summary: 'Asignado por Recepción' }),
    ]);

    const normalOnly = await renderChat(new MockChatService({
      getConversation: async () => ({
        ...chatConversationFixture,
        messages: chatConversationFixture.messages.map(({ serviceAssignment: _serviceAssignment, ...message }) => message),
      }),
    }));
    await waitForChat(normalOnly);
    expect(normalOnly.getByTestId('session-service-requests-probe').props.children).toBe('[]');
  });

  it('keeps the presentation layer independent from fixture DTOs, datasets, and direct network calls', () => {
    const fs = require('fs');
    const screenSource = fs.readFileSync('src/modules/chat/presentation/ChatScreen.tsx', 'utf8');

    expect(screenSource).not.toMatch(/data\/dtos|data\/mocks|(?:^|[^A-Za-z])fetch\s*\(/);
    expect(screenSource).toContain('useChatConversation');
    expect(screenSource).toContain('useSendChatMessage');
    expect(screenSource).toContain("Keyboard.addListener('keyboardDidShow'");
    expect(screenSource).toContain('scrollToEnd');
    expect(screenSource).toContain('GuestChildHeader');
    expect(screenSource).not.toContain('GuestNavigationShell');
    expect(screenSource).not.toContain('GuestRootHeader');
  });

  it('requests a deferred scroll to the last message when Android keyboard opens', async () => {
    const keyboardListeners = new Map<string, () => void>();
    const scrollFrameSpy = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 0;
    });
    jest.spyOn(Keyboard, 'addListener').mockImplementation(
      ((eventName: string, listener: () => void) => {
        keyboardListeners.set(eventName, listener);
        return { remove: jest.fn() };
      }) as never,
    );
    const rendered = await renderChat(new MockChatService());

    await waitForChat(rendered);
    await act(async () => {
      keyboardListeners.get('keyboardDidShow')?.();
    });

    expect(scrollFrameSpy).toHaveBeenCalledTimes(1);
  });

  it('renders approved context, initial thread, accessible left send arrow, and no selected tab', async () => {
    const queryClient = createQueryClient();
    const ChatRoute = () => (
      <QueryClientProvider client={queryClient}><SessionServiceRequestsProvider><ChatScreen service={new MockChatService()} /></SessionServiceRequestsProvider></QueryClientProvider>
    );
    const rendered = await renderRouter({ chat: ChatRoute }, { initialUrl: '/chat' });

    await waitForChat(rendered);
    expect(rendered.getByText('Chat con el hotel')).toBeTruthy();
    expect(rendered.getByText('Recepción · María López · HB-2026-08421')).toBeTruthy();
    expect(rendered.getByText('Hola María, ¿en qué podemos ayudarte?')).toBeTruthy();
    expect(rendered.getByText('Necesito un taxi mañana a las 6:00.')).toBeTruthy();
    expect(rendered.getByText('Claro. ¿Destino Aeropuerto La Aurora?')).toBeTruthy();
    expect(rendered.getByText('Sí, por favor.')).toBeTruthy();
    expect(rendered.getByText('Listo. Solicitud #4832 creada · salida 06:00.')).toBeTruthy();
    expect(rendered.getByPlaceholderText('Escribe un mensaje…')).toBeTruthy();
    expect(rendered.getByLabelText('Enviar mensaje').props.accessibilityRole).toBe('button');
    expect(rendered.getByLabelText('Enviar mensaje').props.accessibilityState.disabled).toBe(true);
    const composerRow = rendered.getByTestId('chat-composer-row');
    expect(composerRow.props.children[0].props.testID).toBe('chat-send-button');
    expect(composerRow.props.children[1].props.testID).toBe('chat-composer-input');
    expect(rendered.getByTestId('chat-composer-input').props.maxLength).toBe(1000);
    expect(rendered.getByTestId('guest-child-header')).toBeTruthy();
    expect(rendered.getByLabelText('Volver')).toBeTruthy();
    expect(rendered.queryByLabelText('Inicio')).toBeNull();
    expect(rendered.queryByLabelText('Servicios')).toBeNull();
    expect(rendered.queryByLabelText('Valet')).toBeNull();
    expect(rendered.queryByLabelText('Hotel')).toBeNull();
    expect(rendered.queryByLabelText('Abrir menú')).toBeNull();
    expect(rendered.queryByLabelText('Abrir chat')).toBeNull();
    expect(rendered.queryByTestId('guest-navigation-chat-fab')).toBeNull();
    expect(rendered.queryByLabelText('Navegación principal de huésped')).toBeNull();
  });

  it('uses the shared child header and delegates its Back action to the navigation stack', async () => {
    const onBack = jest.fn();
    const header = await render(<GuestChildHeader onBack={onBack} title="Encabezado secundario" />);
    await fireEvent.press(header.getByLabelText('Volver'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(header.getByText('Encabezado secundario')).toBeTruthy();
    expect(header.queryByLabelText('Abrir menú')).toBeNull();

    const backSpy = jest.spyOn(router, 'back').mockImplementation(() => undefined);
    const rendered = await renderChat(new MockChatService());
    await waitForChat(rendered);
    await fireEvent.press(rendered.getByLabelText('Volver'));
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('does not send empty or whitespace drafts and trims a valid message before mutation', async () => {
    const sendMessage = jest.fn(async ({ text }: { text: string }) => ({
      message: { fixtureKey: 'chat-message-guest-local-1', author: 'GUEST' as const, text },
    }));
    const rendered = await renderChat(new MockChatService({ sendMessage }));

    await waitForChat(rendered);
    const input = rendered.getByTestId('chat-composer-input');
    const sendButton = rendered.getByTestId('chat-send-button');
    await fireEvent.press(sendButton);
    await fireEvent.changeText(input, '   ');
    await fireEvent.press(rendered.getByTestId('chat-send-button'));
    expect(sendMessage).not.toHaveBeenCalled();

    await fireEvent.changeText(input, '  Necesito ayuda  ');
    await fireEvent.press(rendered.getByTestId('chat-send-button'));
    await waitFor(() => expect(rendered.getByText('Necesito ayuda')).toBeTruthy());
    expect(sendMessage).toHaveBeenCalledWith({ text: 'Necesito ayuda' });
    expect(rendered.getByTestId('chat-composer-input').props.value).toBe('');
  });

  it('shows pending, prevents duplicate or optimistic scroll, then scrolls after success append', async () => {
    const deferred = createDeferred<{ message: { fixtureKey: string; author: 'GUEST'; text: string } }>();
    const sendMessage = jest.fn(() => deferred.promise);
    const scrollFrameSpy = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 0;
    });
    const rendered = await renderChat(new MockChatService({ sendMessage }));

    await waitForChat(rendered);
    await fireEvent.changeText(rendered.getByTestId('chat-composer-input'), 'Necesito una toalla');
    await fireEvent.press(rendered.getByTestId('chat-send-button'));
    await fireEvent.press(rendered.getByTestId('chat-send-button'));

    await waitFor(() => {
      expect(rendered.getByTestId('chat-send-button').props.accessibilityState.disabled).toBe(true);
    });
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(rendered.queryByText('Necesito una toalla')).toBeNull();
    expect(scrollFrameSpy).not.toHaveBeenCalled();

    await act(async () => {
      deferred.resolve({
        message: { fixtureKey: 'chat-message-guest-local-1', author: 'GUEST', text: 'Necesito una toalla' },
      });
    });
    await waitFor(() => expect(rendered.getByText('Necesito una toalla')).toBeTruthy());
    expect(rendered.getByTestId('chat-composer-input').props.value).toBe('');
    expect(scrollFrameSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps the composer immediately usable after success and allows a second message', async () => {
    const rendered = await renderChat(new MockChatService());

    await waitForChat(rendered);
    await fireEvent.changeText(rendered.getByTestId('chat-composer-input'), '¿Pueden ayudarme?');
    await fireEvent.press(rendered.getByTestId('chat-send-button'));
    await waitFor(() => expect(rendered.getByText('¿Pueden ayudarme?')).toBeTruthy());
    expect(rendered.getByText('¿Pueden ayudarme?')).toBeTruthy();
    expect(rendered.getByTestId('chat-composer-input').props.value).toBe('');
    expect(rendered.getByText('Hola María, ¿en qué podemos ayudarte?')).toBeTruthy();
    expect(rendered.queryByText('Mensaje enviado ✓')).toBeNull();
    expect(rendered.queryByText('Nuevo mensaje')).toBeNull();

    await fireEvent.changeText(rendered.getByTestId('chat-composer-input'), 'Gracias');
    await fireEvent.press(rendered.getByTestId('chat-send-button'));
    await waitFor(() => expect(rendered.getByText('Gracias')).toBeTruthy());
    expect(rendered.getByText('¿Pueden ayudarme?')).toBeTruthy();
    expect(rendered.getByTestId('chat-composer-input').props.value).toBe('');
  });

  it('preserves the draft for generic error and manually retries the mutation', async () => {
    const sendMessage = jest
      .fn<Promise<{ message: { fixtureKey: string; author: 'GUEST'; text: string } }>, [{ text: string }]>()
      .mockRejectedValueOnce(new Error('mock failure'))
      .mockResolvedValueOnce({
        message: { fixtureKey: 'chat-message-guest-local-1', author: 'GUEST', text: 'Necesito soporte' },
      });
    const rendered = await renderChat(new MockChatService({ sendMessage }));

    await waitForChat(rendered);
    await fireEvent.changeText(rendered.getByTestId('chat-composer-input'), 'Necesito soporte');
    await fireEvent.press(rendered.getByTestId('chat-send-button'));
    await waitFor(() => expect(rendered.getByTestId('chat-send-error')).toBeTruthy());
    expect(rendered.getByTestId('chat-composer-input').props.value).toBe('Necesito soporte');
    expect(rendered.queryByText('Necesito soporte')).toBeNull();
    await fireEvent.press(rendered.getByText('Reintentar'));
    await waitFor(() => expect(rendered.getByText('Necesito soporte')).toBeTruthy());
    expect(rendered.getByTestId('chat-composer-input').props.value).toBe('');
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it('represents NetworkError as offline, preserves draft, and retries without queuing', async () => {
    const sendMessage = jest
      .fn<Promise<{ message: { fixtureKey: string; author: 'GUEST'; text: string } }>, [{ text: string }]>()
      .mockRejectedValueOnce(new NetworkError())
      .mockResolvedValueOnce({
        message: { fixtureKey: 'chat-message-guest-local-1', author: 'GUEST', text: 'Necesito soporte' },
      });
    const rendered = await renderChat(new MockChatService({ sendMessage }));

    await waitForChat(rendered);
    await fireEvent.changeText(rendered.getByTestId('chat-composer-input'), 'Necesito soporte');
    await fireEvent.press(rendered.getByTestId('chat-send-button'));
    await waitFor(() => expect(rendered.getByTestId('chat-send-offline')).toBeTruthy());
    expect(rendered.getByText('Sin conexión')).toBeTruthy();
    expect(rendered.getByTestId('chat-composer-input').props.value).toBe('Necesito soporte');
    expect(rendered.queryByText('Necesito soporte')).toBeNull();
    await fireEvent.press(rendered.getByText('Reintentar'));
    await waitFor(() => expect(rendered.getByText('Necesito soporte')).toBeTruthy());
    expect(rendered.getByTestId('chat-composer-input').props.value).toBe('');
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it('represents loading, generic query error, and NetworkError query offline independently', async () => {
    const deferred = createDeferred<typeof chatConversationFixture>();
    const loading = await renderChat(new MockChatService({ getConversation: () => deferred.promise }));
    expect(loading.getByTestId('chat-conversation-loading')).toBeTruthy();
    await act(async () => {
      deferred.resolve(chatConversationFixture);
    });
    await waitForChat(loading);
    await loading.unmount();

    const genericError = await renderChat(new MockChatService({
      getConversation: async () => { throw new Error('mock failure'); },
    }));
    await waitFor(() => expect(genericError.getByTestId('chat-conversation-error')).toBeTruthy());
    await genericError.unmount();

    const offline = await renderChat(new MockChatService({
      getConversation: async () => { throw new NetworkError(); },
    }));
    await waitFor(() => expect(offline.getByTestId('chat-conversation-offline')).toBeTruthy());
  });
});
