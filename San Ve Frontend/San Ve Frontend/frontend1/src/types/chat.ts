export type ChatRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: ChatRole;
  content: string;
  isWelcome?: boolean;
  isError?: boolean;
  isStreaming?: boolean;
}

export interface ChatRequest {
  messages: Array<Pick<Message, 'role' | 'content'>>;
}

export interface ChatResponse {
  reply: string;
}

export type ChatErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_REQUEST'
  | 'INVALID_API_KEY'
  | 'MODEL_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'TIMEOUT'
  | 'EMPTY_RESPONSE'
  | 'BLOCKED'
  | 'NETWORK'
  | 'ABORTED';

export interface ChatStreamEvent {
  type: 'delta' | 'tool' | 'done' | 'error';
  text?: string;
  tool?: string;
  code?: ChatErrorCode;
  message?: string;
}
