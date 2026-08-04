
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatError, messageForCode, sendChat, streamChat } from '../api/chatApi';
import type { Message } from '../types/chat';

const INITIAL_MESSAGE: Message = {
  id: 'cinehunt-welcome',
  role: 'assistant',
  isWelcome: true,
  content:
    'Xin chào! Mình là trợ lý CineHunt. Bạn cần tìm phim, xem lịch chiếu hay hỗ trợ đặt vé?',
};

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

const SUPPORTS_STREAMING =
  typeof window !== 'undefined' &&
  typeof ReadableStream !== 'undefined' &&
  typeof TextDecoder !== 'undefined';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

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
              // CHAT-07
              setStatus(TOOL_LABELS[event.tool ?? ''] ?? 'Đang tra dữ liệu…');
            } else if (event.type === 'error') {
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

        const reply = await sendChat(history, controller.signal);
        finish({ content: reply });
      } catch (error) {
        if (controller.signal.aborted) return;

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
