import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useChat } from '../../hooks/useChat';
import styles from './ChatBox.module.css';

export default function ChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isLoading, status, sendMessage, stop, reset } = useChat();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isLoading, isOpen, messages, status]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // FIX CHAT-07: Esc để dừng câu trả lời đang chạy. Người dùng quen phím này
  // hơn là đi tìm nút bấm, nhất là khi câu trả lời dài đang đẩy nút xuống.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isLoading) {
        event.preventDefault();
        stop();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLoading, isOpen, stop]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || isLoading) return;

    setInput('');
    await sendMessage(content);
  };

  return (
    <aside className={styles.chatRoot} aria-label="Trợ lý AI CineHunt">
      {isOpen && (
        <section className={styles.chatPanel}>
          <header className={styles.header}>
            <div className={styles.headerText}>
              <strong>Trợ lý CineHunt</strong>
              <span>Hỗ trợ tìm phim và đặt vé</span>
            </div>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={reset}
                title="Bắt đầu cuộc trò chuyện mới"
                aria-label="Bắt đầu cuộc trò chuyện mới"
              >
                <span className="material-symbols-outlined">refresh</span>
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setIsOpen(false)}
                aria-label="Đóng hộp chat"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </header>

          <div className={styles.messageList} aria-live="polite">
            {messages.map((message) => {
              const isUser = message.role === 'user';
              const showTyping = message.isStreaming && !message.content;

              return (
                <div
                  key={message.id}
                  className={`${styles.messageRow} ${
                    isUser ? styles.userRow : styles.assistantRow
                  }`}
                >
                  <div
                    className={[
                      styles.bubble,
                      isUser ? styles.userBubble : styles.assistantBubble,
                      message.isError ? styles.errorBubble : '',
                      showTyping ? styles.typing : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {showTyping ? (
                      <>
                        <span />
                        <span />
                        <span />
                      </>
                    ) : (
                      <>
                        {message.content}
                        {/* Con trỏ nhấp nháy cho biết chữ vẫn đang chảy về,
                            phân biệt với câu trả lời đã xong. */}
                        {message.isStreaming && (
                          <span className={styles.caret} aria-hidden="true" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* FIX CHAT-05 + CHAT-07: nói rõ chatbot đang tra dữ liệu thật,
                thay vì để người dùng nhìn ba chấm suốt 30 giây. */}
            {status && (
              <div className={styles.statusLine}>
                <span className="material-symbols-outlined">database</span>
                {status}
              </div>
            )}

            <div ref={endRef} />
          </div>

          <form className={styles.inputArea} onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Nhập câu hỏi về phim hoặc đặt vé..."
              maxLength={1000}
              aria-label="Tin nhắn"
            />

            {/* FIX CHAT-07: khi đang chờ, nút Gửi biến thành nút Dừng.
                Trước đây người dùng bị khoá cứng 30 giây không làm gì được. */}
            {isLoading ? (
              <button
                type="button"
                className={styles.stopButton}
                onClick={stop}
                title="Dừng (Esc)"
                aria-label="Dừng câu trả lời"
              >
                <span className="material-symbols-outlined">stop_circle</span>
                Dừng
              </button>
            ) : (
              <button
                type="submit"
                className={styles.sendButton}
                disabled={!input.trim()}
                aria-label="Gửi tin nhắn"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            )}
          </form>
        </section>
      )}

      <button
        type="button"
        className={styles.fab}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Đóng trợ lý CineHunt' : 'Mở trợ lý CineHunt'}
      >
        <span className="material-symbols-outlined">
          {isOpen ? 'close' : 'forum'}
        </span>
      </button>
    </aside>
  );
}
