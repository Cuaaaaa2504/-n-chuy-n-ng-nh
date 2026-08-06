
import axiosClient, { refreshAccessToken } from './axiosClient';
import { API_BASE_URL } from '../config/env';
import type {
  ChatErrorCode,
  ChatRequest,
  ChatResponse,
  ChatStreamEvent,
  Message,
} from '../types/chat';

export class ChatError extends Error {
  readonly code: ChatErrorCode;
  readonly status?: number;

  constructor(code: ChatErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'ChatError';
    this.code = code;
    this.status = status;
  }
}

const ERROR_MESSAGES: Record<ChatErrorCode, string> = {
  MISSING_API_KEY:
    'Máy chủ chưa cấu hình khoá API cho trợ lý AI. Vui lòng báo quản trị viên (thiếu GEMINI_API_KEY trong .env).',
  INVALID_API_KEY:
    'Khoá API của trợ lý AI không hợp lệ hoặc đã hết hạn. Vui lòng báo quản trị viên.',
  MODEL_NOT_FOUND:
    'Máy chủ đang cấu hình sai tên model AI. Vui lòng báo quản trị viên (kiểm tra GEMINI_MODEL).',
  RATE_LIMITED:
    'Trợ lý đang nhận quá nhiều câu hỏi. Bạn đợi khoảng một phút rồi thử lại nhé.',
  TIMEOUT:
    'Trợ lý phản hồi quá lâu. Bạn thử hỏi ngắn gọn hơn hoặc gửi lại giúp mình nhé.',
  BLOCKED:
    'Nội dung này bị bộ lọc an toàn chặn. Bạn thử diễn đạt lại câu hỏi nhé.',
  EMPTY_RESPONSE: 'Trợ lý chưa tạo được câu trả lời. Bạn thử hỏi lại nhé.',
  INVALID_REQUEST:
    'Yêu cầu gửi lên không hợp lệ. Bạn thử tải lại trang rồi hỏi lại nhé.',
  NETWORK:
    'Không kết nối được tới máy chủ CineHunt. Kiểm tra mạng hoặc backend có đang chạy không.',
  UPSTREAM_ERROR: 'Trợ lý AI đang gặp sự cố. Bạn thử lại sau ít phút nhé.',
  ABORTED: 'Đã dừng câu trả lời.',
};

export function messageForCode(code: ChatErrorCode, fallback?: string): string {
  return ERROR_MESSAGES[code] ?? fallback ?? ERROR_MESSAGES.UPSTREAM_ERROR;
}

export function toPayload(messages: Message[]): ChatRequest['messages'] {
  return messages
    .filter((m) => !m.isWelcome && !m.isError && m.content.trim())
    .map(({ role, content }) => ({ role, content: content.trim() }));
}

function toChatError(err: unknown): ChatError {
  const error = err as {
    status?: number;
    message?: string;
    raw?: { response?: { data?: { code?: ChatErrorCode; message?: string } } };
  };

  const data = error?.raw?.response?.data;
  const code: ChatErrorCode =
    data?.code ?? (error?.status ? 'UPSTREAM_ERROR' : 'NETWORK');

  return new ChatError(code, messageForCode(code, data?.message), error?.status);
}

export async function sendChat(
  messages: Message[],
  signal?: AbortSignal,
): Promise<string> {
  try {
    const payload = (await axiosClient.post(
      '/chat',
      { messages: toPayload(messages) },
      { signal },
    )) as unknown as ChatResponse;

    const reply = payload?.reply?.trim();
    if (!reply) {
      throw new ChatError('EMPTY_RESPONSE', messageForCode('EMPTY_RESPONSE'));
    }
    return reply;
  } catch (err) {
    if (err instanceof ChatError) throw err;
    if ((err as Error)?.name === 'CanceledError' || signal?.aborted) {
      throw new ChatError('ABORTED', messageForCode('ABORTED'));
    }
    throw toChatError(err);
  }
}

export async function* streamChat(
  messages: Message[],
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  let response: Response;

  const requestStream = (token: string | null) =>
    fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ messages: toPayload(messages) }),
      signal,
    });

  try {
    let token =
      sessionStorage.getItem('accessToken') ??
      localStorage.getItem('accessToken');

    response = await requestStream(token);

    if (response.status === 401 && !signal?.aborted) {
      try {
        const refreshedToken = await refreshAccessToken();
        if (refreshedToken) {
          sessionStorage.setItem('accessToken', refreshedToken);
          localStorage.removeItem('accessToken');

          token = refreshedToken;
          response = await requestStream(token);
        }
      } catch {
        // Phản hồi 401 ban đầu được xử lý phía dưới nếu refresh thất bại.
      }
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      yield { type: 'error', code: 'ABORTED', message: messageForCode('ABORTED') };
      return;
    }
    yield { type: 'error', code: 'NETWORK', message: messageForCode('NETWORK') };
    return;
  }

  if (response.status === 401) {
    yield {
      type: 'error',
      code: 'INVALID_REQUEST',
      message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại rồi mở ChatBox.',
    };
    return;
  }

  if (!response.ok || !response.body) {
    let code: ChatErrorCode = 'UPSTREAM_ERROR';
    let message: string | undefined;
    try {
      const data = await response.json();
      if (data?.code) code = data.code;
      message = data?.message;
    } catch {
      // Dùng lỗi mặc định khi backend không trả về JSON hợp lệ.
    }
    yield { type: 'error', code, message: messageForCode(code, message) };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');

        const dataLine = rawEvent
          .split('\n')
          .find((line) => line.startsWith('data:'));
        if (!dataLine) continue;

        try {
          yield JSON.parse(dataLine.slice(5).trim()) as ChatStreamEvent;
        } catch {
          // Bỏ qua riêng sự kiện stream bị lỗi, không ngắt toàn bộ phiên chat.
        }
      }
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError' || signal?.aborted) {
      return;
    }
    yield { type: 'error', code: 'NETWORK', message: messageForCode('NETWORK') };
  } finally {
    reader.releaseLock();
  }
}

export default { sendChat, streamChat, toPayload, messageForCode };
