export type ChatMessageAuthor = 'guest' | 'reception';

export interface ChatMessage {
  key: string;
  author: ChatMessageAuthor;
  text: string;
  serviceAssignment?: ChatServiceAssignment;
}

/** UI-safe structured assignment supplied by the Chat fixture boundary. */
export interface ChatServiceAssignment {
  assignmentKey: string;
  title: string;
  summary?: string;
}

export interface ChatContext {
  guestDisplayName: string;
  stayReferenceText: string;
}

export interface ChatConversation {
  context: ChatContext;
  messages: ChatMessage[];
}
