import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { NetworkError } from '@/data/remote/http/HttpError';
import { type ChatService } from '@/modules/chat/data/services/ChatService';
import { type ChatMessage } from '@/modules/chat/domain/models/ChatConversation';
import { useChatConversation } from '@/modules/chat/presentation/hooks/useChatConversation';
import { useSendChatMessage } from '@/modules/chat/presentation/hooks/useSendChatMessage';
import { chatStyles } from '@/modules/chat/presentation/chatStyles';
import { GuestNavigationShell } from '@/modules/navigation';
import { deriveRemoteState } from '@/state/remoteState';

export interface ChatScreenProps {
  service?: ChatService;
}

interface ChatStateCardProps {
  body: string;
  offline?: boolean;
  onRetry: () => void;
  testID: string;
  title: string;
}

function ChatStateCard({ body, offline = false, onRetry, testID, title }: ChatStateCardProps) {
  return (
    <View style={[chatStyles.stateCard, offline && chatStyles.offlineStateCard]} testID={testID}>
      <Text style={chatStyles.stateTitle}>{title}</Text>
      <Text style={chatStyles.stateBody}>{body}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={chatStyles.button}>
        <Text style={chatStyles.buttonLabel}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isGuest = message.author === 'guest';
  const authorLabel = isGuest ? 'Tú' : 'Recepción';

  return (
    <View
      accessibilityLabel={`${authorLabel}: ${message.text}`}
      style={[chatStyles.bubble, isGuest ? chatStyles.guestBubble : chatStyles.receptionBubble]}
      testID={`chat-message-${message.key}`}
    >
      <Text style={chatStyles.bubbleAuthor}>{authorLabel}</Text>
      <Text style={chatStyles.bubbleText}>{message.text}</Text>
    </View>
  );
}

function ChatLoading() {
  return (
    <View style={chatStyles.stateContent} testID="chat-conversation-loading">
      <Text style={chatStyles.title}>Cargando conversación</Text>
      <View style={chatStyles.skeleton} />
      <View style={chatStyles.skeleton} />
      <View style={chatStyles.skeleton} />
    </View>
  );
}

/** Chat presentation with local composer state and Query-owned conversation state. */
export function ChatScreen({ service }: ChatScreenProps) {
  const conversationQuery = useChatConversation(service);
  const conversationState = deriveRemoteState(conversationQuery, () => false);
  const submission = useSendChatMessage(service);
  const [draftText, setDraftText] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const submissionInFlight = useRef(false);
  const messageKeyAwaitingScroll = useRef<string | null>(null);
  const messagesScrollViewRef = useRef<ScrollView>(null);

  const scrollToLastMessage = useCallback(() => {
    requestAnimationFrame(() => {
      messagesScrollViewRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      scrollToLastMessage();
    });
    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, [scrollToLastMessage]);

  useEffect(() => {
    const messageKey = messageKeyAwaitingScroll.current;

    if (conversationState.kind !== 'success' || !messageKey) return;

    const messageWasRendered = conversationState.data.messages.some(
      (message) => message.key === messageKey,
    );

    if (!messageWasRendered) return;

    scrollToLastMessage();
    messageKeyAwaitingScroll.current = null;
  }, [conversationState, scrollToLastMessage]);

  function submitDraft(): void {
    const text = draftText.trim();

    if (!text || submission.isPending || submissionInFlight.current) return;

    submissionInFlight.current = true;
    submission.mutate(text, {
      onSuccess: (message) => {
        setDraftText('');
        messageKeyAwaitingScroll.current = message.key;
      },
      onSettled: () => {
        submissionInFlight.current = false;
      },
    });
  }

  if (conversationState.kind === 'loading') {
    return (
      <View style={chatStyles.screen}>
        <ChatLoading />
        <GuestNavigationShell />
      </View>
    );
  }

  if (conversationState.kind === 'offline') {
    return (
      <View style={chatStyles.screen}>
        <View style={chatStyles.stateContent}>
          <ChatStateCard
            body="Conéctate a internet para ver la conversación."
            offline
            onRetry={() => void conversationQuery.refetch()}
            testID="chat-conversation-offline"
            title="Sin conexión"
          />
        </View>
        <GuestNavigationShell />
      </View>
    );
  }

  if (conversationState.kind === 'error') {
    return (
      <View style={chatStyles.screen}>
        <View style={chatStyles.stateContent}>
          <ChatStateCard
            body="Intenta nuevamente."
            onRetry={() => void conversationQuery.refetch()}
            testID="chat-conversation-error"
            title="No pudimos cargar la conversación"
          />
        </View>
        <GuestNavigationShell />
      </View>
    );
  }

  // Empty is not an approved Chat experience. This only exhausts RemoteState.
  if (conversationState.kind === 'empty') return null;

  const isSubmitOffline = submission.isError && submission.error instanceof NetworkError;
  const isSubmitError = submission.isError && !isSubmitOffline;
  const isSendDisabled = !draftText.trim() || submission.isPending;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={chatStyles.screen}
      testID="chat-screen"
    >
      <View style={chatStyles.conversationBody}>
        <View style={chatStyles.header}>
          <Text style={chatStyles.title}>Chat con el hotel</Text>
          <Text style={chatStyles.context}>
            Recepción · {conversationState.data.context.guestDisplayName} · {conversationState.data.context.stayReferenceText}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={chatStyles.messagesContent}
          ref={messagesScrollViewRef}
          style={chatStyles.messages}
          testID="chat-messages-scroll"
        >
          {conversationState.data.messages.map((message) => <ChatBubble key={message.key} message={message} />)}
        </ScrollView>

        <View style={chatStyles.composer}>
          {isSubmitError ? (
            <ChatStateCard
              body="Intenta nuevamente."
              onRetry={submitDraft}
              testID="chat-send-error"
              title="No pudimos enviar tu mensaje"
            />
          ) : null}

          {isSubmitOffline ? (
            <ChatStateCard
              body="Conéctate a internet para enviar tu mensaje."
              offline
              onRetry={submitDraft}
              testID="chat-send-offline"
              title="Sin conexión"
            />
          ) : null}

          <View style={chatStyles.composerRow} testID="chat-composer-row">
            <Pressable
              accessibilityHint="Envía el mensaje a Recepción."
              accessibilityLabel={submission.isPending ? 'Enviando mensaje' : 'Enviar mensaje'}
              accessibilityRole="button"
              accessibilityState={{ busy: submission.isPending, disabled: isSendDisabled }}
              disabled={isSendDisabled}
              onPress={submitDraft}
              style={[chatStyles.sendIconButton, isSendDisabled && chatStyles.sendIconButtonDisabled]}
              testID="chat-send-button"
            >
              <Text accessible={false} style={chatStyles.sendIcon}>↑</Text>
            </Pressable>
            <TextInput
              accessibilityLabel="Mensaje para Recepción"
              editable={!submission.isPending}
              onChangeText={setDraftText}
              placeholder="Escribe un mensaje…"
              style={chatStyles.input}
              testID="chat-composer-input"
              value={draftText}
            />
          </View>
        </View>
      </View>
      {!isKeyboardVisible ? <GuestNavigationShell /> : null}
    </KeyboardAvoidingView>
  );
}
