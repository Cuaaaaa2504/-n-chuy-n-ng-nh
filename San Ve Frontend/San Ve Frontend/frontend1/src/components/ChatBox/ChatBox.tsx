import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useChat } from '../../hooks/useChat';
import styles from './ChatBox.module.css';

export default function ChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage } = useChat();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isLoading, isOpen, messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = input.trim();
    if (!content || isLoading) {
      return;
    }

    setInput('');
    await sendMessage(content);
  };

  return (
    <aside className={styles.chatRoot} aria-label="Trợ lý AI CineHunt">
      {isOpen && (
        <section className={styles.chatPanel}>
          <header className={styles.header}>
            <div>
              <strong>Trợ lý CineHunt</strong>
              <span>Hỗ trợ tìm phim và đặt vé</span>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label="Đóng hộp chat"
            >
              ×
            </button>
          </header>

          <div className={styles.messageList} aria-live="polite">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`${styles.messageRow} ${
                  message.role === 'user'
                    ? styles.userRow
                    : styles.assistantRow
                }`}
              >
                <div
                  className={`${styles.bubble} ${
                    message.role === 'user'
                      ? styles.userBubble
                      : styles.assistantBubble
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className={`${styles.messageRow} ${styles.assistantRow}`}>
                <div
                  className={`${styles.bubble} ${styles.assistantBubble} ${styles.typing}`}
                  aria-label="Trợ lý đang trả lời"
                >
                  <span />
                  <span />
                  <span />
                </div>
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
              disabled={isLoading}
              aria-label="Tin nhắn"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label="Gửi tin nhắn"
            >
              Gửi
            </button>
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
        {isOpen ? '×' : '💬'}
      </button>
    </aside>
  );
}
