import { useQuery } from '@tanstack/react-query';

import { mapChatConversationFixtureDto } from '@/modules/chat/data/mappers/mapChatFixtureDto';
import { MockChatService } from '@/modules/chat/data/mocks/MockChatService';
import { type ChatService } from '@/modules/chat/data/services/ChatService';
import { type ChatConversation } from '@/modules/chat/domain/models/ChatConversation';

export const chatConversationQueryKey = ['chat', 'conversation'] as const;

const defaultChatService: ChatService = new MockChatService();

async function loadChatConversation(service: ChatService): Promise<ChatConversation> {
  return mapChatConversationFixtureDto(await service.getConversation());
}

/** TanStack Query owns the conversation state; this hook creates no store. */
export function useChatConversation(service: ChatService = defaultChatService) {
  return useQuery({
    queryKey: chatConversationQueryKey,
    queryFn: () => loadChatConversation(service),
    retry: false,
  });
}
