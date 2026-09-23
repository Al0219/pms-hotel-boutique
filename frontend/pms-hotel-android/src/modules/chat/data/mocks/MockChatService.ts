import { chatConversationFixture } from '@/data/mocks/chat/chatConversationFixture';
import {
  type ChatConversationFixtureDto,
  type SendChatMessageFixtureInput,
  type SendChatMessageFixtureResult,
} from '@/modules/chat/data/dtos/ChatFixtureDto';
import { type ChatService } from '@/modules/chat/data/services/ChatService';

export interface MockChatServiceOptions {
  getConversation?: () => Promise<ChatConversationFixtureDto>;
  sendMessage?: (input: SendChatMessageFixtureInput) => Promise<SendChatMessageFixtureResult>;
}

/** Controlled fixture boundary for Chat frontend-first implementation and tests. */
export class MockChatService implements ChatService {
  private readonly getConversationMock: () => Promise<ChatConversationFixtureDto>;
  private readonly sendMessageMock: (input: SendChatMessageFixtureInput) => Promise<SendChatMessageFixtureResult>;
  private sentMessageCount = 0;

  public constructor(options: MockChatServiceOptions = {}) {
    this.getConversationMock = options.getConversation ?? (async () => chatConversationFixture);
    this.sendMessageMock = options.sendMessage ?? (async ({ text }) => {
      this.sentMessageCount += 1;

      return {
        message: {
          fixtureKey: `chat-message-guest-local-${this.sentMessageCount}`,
          author: 'GUEST',
          text,
        },
      };
    });
  }

  public getConversation(): Promise<ChatConversationFixtureDto> {
    return this.getConversationMock();
  }

  public sendMessage(input: SendChatMessageFixtureInput): Promise<SendChatMessageFixtureResult> {
    return this.sendMessageMock(input);
  }
}
