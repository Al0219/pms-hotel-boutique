/**
 * Frontend-only fixture contracts approved for IMP-AND-0104.
 * They deliberately do not represent a Backend API.
 */
export type ChatMessageAuthorFixture = 'GUEST' | 'RECEPTION';

export interface ChatFixtureContextDto {
  guestDisplayName: string;
  stayReferenceText: string;
}

export interface ChatMessageFixtureDto {
  fixtureKey: string;
  author: ChatMessageAuthorFixture;
  text: string;
  serviceAssignment?: ChatServiceAssignmentFixtureDto;
}

/** Structured frontend mock metadata; never derived from message text. */
export interface ChatServiceAssignmentFixtureDto {
  assignmentKey: string;
  title: string;
  summary?: string;
}

export interface ChatConversationFixtureDto {
  context: ChatFixtureContextDto;
  messages: ChatMessageFixtureDto[];
}

export interface SendChatMessageFixtureInput {
  text: string;
}

export interface SendChatMessageFixtureResult {
  message: ChatMessageFixtureDto;
}
