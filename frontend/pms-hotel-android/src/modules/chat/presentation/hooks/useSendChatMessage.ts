import { useMutation, useQueryClient } from '@tanstack/react-query';

import { mapSendChatMessageFixtureResult } from '@/modules/chat/data/mappers/mapChatFixtureDto';
import { MockChatService } from '@/modules/chat/data/mocks/MockChatService';
import { type ChatService } from '@/modules/chat/data/services/ChatService';
import { type ChatConversation, type ChatMessage } from '@/modules/chat/domain/models/ChatConversation';
import { chatConversationQueryKey } from '@/modules/chat/presentation/hooks/useChatConversation';

const defaultChatService: ChatService = new MockChatService();

async function sendChatMessage(service: ChatService, text: string): Promise<ChatMessage> {
  return mapSendChatMessageFixtureResult(await service.sendMessage({ text }));
}

/** Mutation state and post-success thread data remain owned by TanStack Query. */
export function useSendChatMessage(service: ChatService = defaultChatService) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (text: string) => sendChatMessage(service, text),
    onSuccess: (message) => {
      queryClient.setQueryData<ChatConversation>(chatConversationQueryKey, (conversation) => {
        if (!conversation) return conversation;

        return {
          ...conversation,
          messages: [...conversation.messages, message],
        };
      });
    },
    retry: false,
  });
}
