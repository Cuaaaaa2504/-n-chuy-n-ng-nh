// src/api/chatApi.ts
//
// FIX CHAT-02 — Chatbot gọi `/api/chat` thay vì dùng axiosClient.
//
// Code cũ trong useChat.ts:
//     await fetch('/api/chat', { ... })
//
// Đường dẫn tương đối đó chỉ chạy được nhờ proxy của Vite dev server (xem
// `vite.config.ts`: '/api' -> localhost:3000, có rewrite bỏ tiền tố). Proxy là
// thứ CHỈ TỒN TẠI KHI `npm run dev`. Sau `npm run build`, bundle được host ở
// một origin khác (Nginx, Vercel, Netlify...) và không có ai rewrite gì nữa:
// request bắn thẳng vào frontend server, nhận về 404 hoặc trang index.html.
// Triệu chứng kinh điển là `JSON.parse` chết với "Unexpected token '<'".
//
// Tệ hơn nữa: `/api` trên backend đang là Swagger UI (main.ts:
// `SwaggerModule.setup('api', app, document)`). Nếu ai đó "sửa" bằng cách bỏ
// rewrite trong proxy thì POST /api/chat lại rơi vào Swagger.
//
// Nay mọi lời gọi đều đi qua `axiosClient`, vốn đã có sẵn baseURL lấy từ
// `config/env.ts`, interceptor gắn token và logic refresh. Streaming không dùng
// axios được (xem chú thích ở `streamChat`) nhưng vẫn lấy URL từ cùng một
// nguồn `API_BASE_URL`, không bao giờ dùng đường dẫn tương đối.

import axiosClient from './axiosClient';
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

/**
 * FIX CHAT-06 — thông báo lỗi phải nói đúng chuyện gì đã xảy ra.
 *
 * Trước đây mọi trường hợp đều hiện đúng một câu "Không thể nhận phản hồi từ
 * trợ lý AI lúc này." — 400 do payload sai, 404 do tên model sai, 429 do hết
 * hạn mức và 500 do thiếu API key trông y hệt nhau. Debug bằng cách đoán.
 *
 * Backend giờ trả kèm trường `code`; bảng dưới đây dịch nó sang câu tiếng Việt
 * vừa đủ cho người dùng cuối, vừa đủ cho lập trình viên biết phải sửa ở đâu.
 */
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

/**
 * FIX CHAT-01 (phía client) — không gửi lời chào lên Gemini.
 *
 * Gemini yêu cầu lịch sử bắt đầu bằng `user` và luân phiên user/model. Danh
 * sách tin nhắn ở frontend luôn mở đầu bằng lời chào `role: 'assistant'` do
 * client tự tạo, nên payload đầu tiên là [assistant, user] -> phần tử đầu là
 * `model` -> 400 INVALID_ARGUMENT ngay ở tin nhắn đầu tiên của mọi phiên chat.
 *
 * Lời chào chưa bao giờ được model sinh ra, nó chỉ là văn bản trang trí, nên
 * việc cắt nó khỏi payload không làm mất ngữ cảnh gì cả.
 *
 * Backend cũng lọc lại lần nữa (`buildContents` trong chat.service.ts) — hai
 * lớp là cố ý, vì backend không được phép tin client gửi đúng định dạng.
 */
export function toPayload(messages: Message[]): ChatRequest['messages'] {
  return messages
    .filter((m) => !m.isWelcome && !m.isError && m.content.trim())
    .map(({ role, content }) => ({ role, content: content.trim() }));
}

/** Đọc mã lỗi từ object lỗi mà interceptor của axiosClient ném ra. */
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

/** Gọi POST /chat (không streaming). Dùng khi trình duyệt không hỗ trợ stream. */
export async function sendChat(
  messages: Message[],
  signal?: AbortSignal,
): Promise<string> {
  try {
    // LƯU Ý: interceptor response của axiosClient đã unwrap `response.data`
    // một lần rồi, nên ở đây KHÔNG được `.data` thêm lần nữa.
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

/**
 * FIX CHAT-07 — streaming.
 *
 * VÌ SAO DÙNG `fetch` CHỨ KHÔNG PHẢI axiosClient Ở ĐÂY:
 * axios trên trình duyệt dựa vào XMLHttpRequest, và XHR chỉ cho đọc
 * `responseText` khi đã nhận xong (hoặc phải tự cắt chuỗi tăng dần rất dễ sai
 * với UTF-8 nhiều byte — tiếng Việt có dấu chính là trường hợp đó).
 * `fetch` cho ReadableStream thật, kèm `TextDecoder({ stream: true })` xử lý
 * đúng ký tự bị cắt ngang giữa hai chunk.
 *
 * Điểm mấu chốt để KHÔNG tái phạm CHAT-02: URL được ghép từ `API_BASE_URL` —
 * cùng nguồn sự thật với axiosClient — chứ tuyệt đối không phải '/api/chat'.
 */
export async function* streamChat(
  messages: Message[],
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  let response: Response;

  try {
    const token = localStorage.getItem('accessToken');
    response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ messages: toPayload(messages) }),
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      yield { type: 'error', code: 'ABORTED', message: messageForCode('ABORTED') };
      return;
    }
    yield { type: 'error', code: 'NETWORK', message: messageForCode('NETWORK') };
    return;
  }

  if (!response.ok || !response.body) {
    // Backend trả lỗi trước khi kịp mở luồng -> body vẫn là JSON bình thường.
    let code: ChatErrorCode = 'UPSTREAM_ERROR';
    let message: string | undefined;
    try {
      const data = await response.json();
      if (data?.code) code = data.code;
      message = data?.message;
    } catch {
      /* body rỗng hoặc không phải JSON — giữ mã mặc định */
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

      // Sự kiện SSE ngăn cách bằng dòng trống. Ranh giới chunk TCP không trùng
      // ranh giới sự kiện, nên phải giữ phần dư trong `buffer`.
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
          /* bỏ qua sự kiện hỏng, luồng vẫn chạy tiếp */
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
