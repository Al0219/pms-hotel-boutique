import { requireDtoField } from '@/data/mapping/requireDtoField';
import { DomainMappingError } from '@/domain/errors/DomainMappingError';
import {
  type ChatContext,
  type ChatConversation,
  type ChatMessage,
  type ChatMessageAuthor,
  type ChatServiceAssignment,
} from '@/modules/chat/domain/models/ChatConversation';
import {
  type ChatConversationFixtureDto,
  type ChatFixtureContextDto,
  type ChatMessageAuthorFixture,
  type ChatMessageFixtureDto,
  type ChatServiceAssignmentFixtureDto,
  type SendChatMessageFixtureResult,
} from '@/modules/chat/data/dtos/ChatFixtureDto';

function requireNonBlankString(value: string, field: string): string {
  const requiredValue = requireDtoField(value, field);

  if (requiredValue.trim().length === 0) {
    throw new DomainMappingError(field);
  }

  return requiredValue;
}

function mapServiceAssignment(dto: ChatServiceAssignmentFixtureDto | undefined, field: string): ChatServiceAssignment | undefined {
  if (!dto) return undefined;

  return {
    assignmentKey: requireNonBlankString(dto.assignmentKey, `${field}.assignmentKey`),
    summary: dto.summary === undefined ? undefined : requireNonBlankString(dto.summary, `${field}.summary`),
    title: requireNonBlankString(dto.title, `${field}.title`),
  };
}

function mapAuthor(author: ChatMessageAuthorFixture, field: string): ChatMessageAuthor {
  if (author === 'GUEST') return 'guest';
  if (author === 'RECEPTION') return 'reception';

  throw new DomainMappingError(field);
}

function mapContext(dto: ChatFixtureContextDto): ChatContext {
  const context = requireDtoField(dto, 'chat.context');

  return {
    guestDisplayName: requireNonBlankString(context.guestDisplayName, 'chat.context.guestDisplayName'),
    stayReferenceText: requireNonBlankString(context.stayReferenceText, 'chat.context.stayReferenceText'),
  };
}

export function mapChatMessageFixtureDto(dto: ChatMessageFixtureDto, index = 0): ChatMessage {
  const message = requireDtoField(dto, `chat.messages[${index}]`);

  const field = `chat.messages[${index}]`;

  return {
    key: requireNonBlankString(message.fixtureKey, `chat.messages[${index}].fixtureKey`),
    author: mapAuthor(requireDtoField(message.author, `chat.messages[${index}].author`), `chat.messages[${index}].author`),
    text: requireNonBlankString(message.text, `chat.messages[${index}].text`),
    ...(message.serviceAssignment ? { serviceAssignment: mapServiceAssignment(message.serviceAssignment, field) } : {}),
  };
}

/** Pure mapping boundary between local fixture DTOs and UI-safe domain models. */
export function mapChatConversationFixtureDto(dto: ChatConversationFixtureDto): ChatConversation {
  const conversation = requireDtoField(dto, 'chat');
  const messages = requireDtoField(conversation.messages, 'chat.messages');

  return {
    context: mapContext(conversation.context),
    messages: messages.map(mapChatMessageFixtureDto),
  };
}

export function mapSendChatMessageFixtureResult(dto: SendChatMessageFixtureResult): ChatMessage {
  const result = requireDtoField(dto, 'chat.sendResult');

  return mapChatMessageFixtureDto(requireDtoField(result.message, 'chat.sendResult.message'));
}
