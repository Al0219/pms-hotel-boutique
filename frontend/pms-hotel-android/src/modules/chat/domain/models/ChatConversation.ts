export type ChatMessageAuthor = 'guest' | 'reception';

export interface ChatMessage {
  key: string;
  author: ChatMessageAuthor;
  text: string;
}

export interface ChatContext {
  guestDisplayName: string;
  stayReferenceText: string;
}

export interface ChatConversation {
  context: ChatContext;
  messages: ChatMessage[];
}
