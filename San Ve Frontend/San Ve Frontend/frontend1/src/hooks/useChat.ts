// src/hooks/useChat.ts
// Các lỗi được xử lý trong file này:
//   CHAT-01  Lời chào `role: 'assistant'` bị gửi lên Gemini -> 400.
//   CHAT-02  `fetch('/api/chat')` phụ thuộc proxy Vite -> chết khi build.
//   CHAT-06  Mọi lỗi đều hiện chung một câu -> không debug được.
//   CHAT-07  Không streaming, không huỷ được.
// Toàn bộ phần nói chuyện với mạng đã chuyển sang `src/api/chatApi.ts`. Hook
// này chỉ còn lo trạng thái React, đúng khuôn với `useRecommendations.ts`.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatError, messageForCode, sendChat, streamChat } from '../api/chatApi';
import type { Message } from '../types/chat';

/*
 * Cờ `isWelcome` là mấu chốt.
 * Lời chào này do client tự tạo, model chưa bao giờ sinh ra nó. Trước đây nó
 * nằm lẫn trong `messages` và được gửi nguyên vẹn lên backend, khiến phần tử
 * đầu tiên của `contents` có role `model` — vi phạm quy tắc "phải bắt đầu bằng
 * user" của Gemini và làm hỏng NGAY tin nhắn đầu tiên của mọi phiên chat.
 * Đánh dấu bằng cờ thay vì so `id === 'cinehunt-welcome'` để chỗ lọc
 * (`toPayload` trong chatApi.ts) không phải biết gì về id cụ thể.
 */
const INITIAL_MESSAGE: Message = {
  id: 'cinehunt-welcome',
  role: 'assistant',
  isWelcome: true,
  content:
    'Xin chào! Mình là trợ lý CineHunt. Bạn cần tìm phim, xem lịch chiếu hay hỗ trợ đặt vé?',
};

/** Nhãn hiển thị khi model đang tra dữ liệu thật (FIX CHAT-05 + CHAT-07). */
const TOOL_LABELS: Record<string, string> = {
  search_movies: 'Đang tìm phim…',
  get_movie_detail: 'Đang xem thông tin phim…',
  get_showtimes: 'Đang tra lịch chiếu…',
  check_seat_availability: 'Đang kiểm tra ghế trống…',
  list_combos: 'Đang xem bảng giá combo…',
  list_cinemas: 'Đang tra danh sách rạp…',
  hold_seats: 'Đang giữ ghế…',
  create_booking: 'Đang tạo đơn đặt vé…',
  create_payment: 'Đang khởi tạo thanh toán…',
};

/*
 * Chat bubble hiện dùng text thuần, không phải Markdown renderer. Chuẩn hoá
 * câu trả lời sau khi stream kết thúc để không còn hiện **, # hoặc backtick.
 */
function plainTextFromMarkdown(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\*\*([\s\S]*?)\*\*/g, '$1')
    .replace(/__([\s\S]*?)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function createId(role: Message['role']): string {
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createMessage(
  role: Message['role'],
  content: string,
  extra: Partial<Message> = {},
): Message {
  return { id: createId(role), role, content, ...extra };
}

/*
 * Trình duyệt cũ và một số WebView không có ReadableStream trên Response.
 * Kiểm tra một lần lúc nạp module thay vì mỗi lần gửi tin.
 */
const SUPPORTS_STREAMING =
  typeof window !== 'undefined' &&
  typeof ReadableStream !== 'undefined' &&
  typeof TextDecoder !== 'undefined';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  /** Nhãn trạng thái phụ ("Đang tra lịch chiếu…"), null khi không có. */
  const [status, setStatus] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  // Khóa đồng bộ để chặn gửi hai request trước khi React render lại.
  const sendingRef = useRef(false);

  // Huỷ request đang chạy khi component unmount (đóng tab, đổi route). Không
  // có dòng này thì stream vẫn chạy tiếp và setState trên component đã chết.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  /*Nút "Dừng". */
  const stop = useCallback(() => {
    sendingRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    setStatus(null);
    setMessages((current) =>
      current.map((m) =>
        m.isStreaming
          ? {
              ...m,
              isStreaming: false,
              // Giữ lại phần chữ đã nhận được — người dùng bấm dừng vì đã đọc
              // đủ, xoá đi là phản tác dụng.
              content: plainTextFromMarkdown(m.content) || 'Đã dừng câu trả lời.',
            }
          : m,
      ),
    );
  }, []);

  const reset = useCallback(() => {
    sendingRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    setStatus(null);
    setMessages([INITIAL_MESSAGE]);
  }, []);

  const sendMessage = useCallback(
    async (rawContent: string) => {
      const content = rawContent.trim();
      if (!content || sendingRef.current) return;
      sendingRef.current = true;

      const userMessage = createMessage('user', content);

      // Lịch sử gửi đi phải tính CẢ tin vừa gõ. `messages` trong closure chưa
      // có nó (setState bất đồng bộ), nên ghép tay thay vì đọc lại state.
      const history = [...messages, userMessage];

      const assistantId = createId('assistant');

      setMessages((current) => [
        ...current,
        userMessage,
        { id: assistantId, role: 'assistant', content: '', isStreaming: true },
      ]);
      setIsLoading(true);
      setStatus(null);

      const controller = new AbortController();
      abortRef.current = controller;

      const appendDelta = (text: string) => {
        setMessages((current) =>
          current.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + text } : m,
          ),
        );
      };

      const finish = (patch: Partial<Message>) => {
        setMessages((current) =>
          current.map((m) => {
            if (m.id !== assistantId) return m;

            const nextContent = patch.content ?? m.content;
            return {
              ...m,
              isStreaming: false,
              ...patch,
              content: patch.isError
                ? nextContent
                : plainTextFromMarkdown(nextContent),
            };
          }),
        );
      };

      const showError = (message: string) => {
        finish({ content: message, isError: true });
      };

      try {
        if (SUPPORTS_STREAMING) {
          let received = false;

          for await (const event of streamChat(history, controller.signal)) {
            if (event.type === 'delta' && event.text) {
              received = true;
              setStatus(null);
              appendDelta(event.text);
            } else if (event.type === 'tool') {
              // Cho người dùng thấy chatbot đang tra dữ liệu thật chứ không
              // treo im lặng — đúng phần "chỉ thấy animation ba chấm" của
              // CHAT-07.
              setStatus(TOOL_LABELS[event.tool ?? ''] ?? 'Đang tra dữ liệu…');
            } else if (event.type === 'error') {
              // Huỷ do người dùng không phải lỗi: giữ nguyên phần đã nhận.
              if (event.code === 'ABORTED') {
                finish({});
                return;
              }
              showError(
                event.message ?? messageForCode(event.code ?? 'UPSTREAM_ERROR'),
              );
              return;
            } else if (event.type === 'done') {
              break;
            }
          }

          if (!received) {
            showError(messageForCode('EMPTY_RESPONSE'));
            return;
          }

          finish({});
          return;
        }

        // Đường lùi cho trình duyệt không hỗ trợ stream: vẫn đi qua
        // axiosClient, vẫn không dùng đường dẫn tương đối (FIX CHAT-02).
        const reply = await sendChat(history, controller.signal);
        finish({ content: reply });
      } catch (error) {
        if (controller.signal.aborted) return;

        // Hiện đúng nguyên nhân thay vì một câu chung chung.
        const message =
          error instanceof ChatError
            ? error.message
            : messageForCode('UPSTREAM_ERROR');
        showError(message);
      } finally {
        sendingRef.current = false;
        if (abortRef.current === controller) abortRef.current = null;
        setIsLoading(false);
        setStatus(null);
      }
    },
    [messages],
  );

  return {
    messages,
    isLoading,
    status,
    sendMessage,
    stop,
    reset,
    canStream: SUPPORTS_STREAMING,
  };
}

export default useChat;
