export type ChatRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: ChatRole;
  content: string;
  /** true khi tin nhắn là lời chào khởi tạo ở client (FIX CHAT-01). */
  isWelcome?: boolean;
  /** true khi tin nhắn là thông báo lỗi, để hiển thị khác bubble thường. */
  isError?: boolean;
  /** true khi nội dung đang được stream về (FIX CHAT-07). */
  isStreaming?: boolean;
}

export interface ChatRequest {
  messages: Array<Pick<Message, 'role' | 'content'>>;
}

export interface ChatResponse {
  reply: string;
}

/*
 * Mã lỗi backend trả về (FIX CHAT-06).
 * Khớp 1-1 với `ChatErrorCode` trong cinehunt-backend/src/chat/chat.service.ts.
 */
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

/** Sự kiện SSE do POST /chat/stream bắn ra. */
export interface ChatStreamEvent {
  type: 'delta' | 'tool' | 'done' | 'error';
  text?: string;
  tool?: string;
  code?: ChatErrorCode;
  message?: string;
}
