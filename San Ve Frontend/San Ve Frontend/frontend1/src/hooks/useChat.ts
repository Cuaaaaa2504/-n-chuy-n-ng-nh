import { useCallback, useState } from 'react';
import type { ChatRequest, ChatResponse, Message } from '../types/chat';

const INITIAL_MESSAGE: Message = {
  id: 'cinehunt-welcome',
  role: 'assistant',
  content:
    'Xin chào! Mình là trợ lý CineHunt. Bạn cần tìm phim, chọn suất chiếu hay hỗ trợ đặt vé?',
};

function createMessage(role: Message['role'], content: string): Message {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  };
}

function getBackendError(data: unknown): string | null {
  if (!data || typeof data !== 'object' || !('message' in data)) {
    return null;
  }

  const message = (data as { message?: unknown }).message;

  if (Array.isArray(message)) {
    return message
      .filter((item): item is string => typeof item === 'string')
      .join(', ');
  }

  return typeof message === 'string' ? message : null;
}

function isChatResponse(data: unknown): data is ChatResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'reply' in data &&
    typeof (data as { reply?: unknown }).reply === 'string'
  );
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (rawContent: string) => {
      const content = rawContent.trim();

      if (!content || isLoading) {
        return;
      }

      const userMessage = createMessage('user', content);

      const requestMessages = [...messages, userMessage].map(
        ({ role, content: messageContent }) => ({
          role,
          content: messageContent,
        }),
      );

      setMessages((current) => [...current, userMessage]);
      setIsLoading(true);

      try {
        const payload: ChatRequest = {
          messages: requestMessages,
        };

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            getBackendError(data) ||
              'Không thể kết nối đến trợ lý CineHunt.',
          );
        }

        if (!isChatResponse(data) || !data.reply.trim()) {
          throw new Error('AI không trả về nội dung hợp lệ.');
        }

        setMessages((current) => [
          ...current,
          createMessage('assistant', data.reply.trim()),
        ]);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Đã xảy ra lỗi khi gửi tin nhắn.';

        setMessages((current) => [
          ...current,
          createMessage(
            'assistant',
            `${errorMessage} Vui lòng thử lại sau.`,
          ),
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages],
  );

  return {
    messages,
    isLoading,
    sendMessage,
  };
}
