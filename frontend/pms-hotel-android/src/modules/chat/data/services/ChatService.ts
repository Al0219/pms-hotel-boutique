import {
  type ChatConversationFixtureDto,
  type SendChatMessageFixtureInput,
  type SendChatMessageFixtureResult,
} from '@/modules/chat/data/dtos/ChatFixtureDto';

/** Frontend mock remote boundary. A Backend API is intentionally deferred. */
export interface ChatService {
  getConversation(): Promise<ChatConversationFixtureDto>;
  sendMessage(input: SendChatMessageFixtureInput): Promise<SendChatMessageFixtureResult>;
}
