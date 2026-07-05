import { useEffect } from 'react';
import type { BookingTicket } from '../types/booking';
import { useTheme } from '../context/ThemeContext';

type Props = {
  open: boolean;
  loading: boolean;
  error: string;
  tickets: BookingTicket[];
  onClose: () => void;
  onRetry: () => void;
};

export default function BookingTicketsModal({ open, loading, error, tickets, onClose, onRetry }: Props) {
  const { darkMode } = useTheme();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <section
        className={`relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl p-6 ${
          darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-extrabold">🎟 QR Vé của bạn</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            ✕
          </button>
        </header>

        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-center py-6">
            <p className="text-red-500 mb-3">{error}</p>
            <button
              onClick={onRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition"
            >
              Thử lại
            </button>
          </div>
        )}

        {!loading && !error && tickets.length === 0 && (
          <p className={`text-center py-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Không có vé nào.
          </p>
        )}

        <div className="space-y-5">
          {tickets.map((ticket) => (
            <article
              key={ticket.id}
              className={`rounded-xl p-4 flex flex-col items-center gap-3 border ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <p className="font-bold text-center">{ticket.movieTitle || 'Vé xem phim'}</p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Ghế: <strong>{ticket.seatCode || ticket.seatName || 'N/A'}</strong>
              </p>
              <img
                className="w-40 h-40 rounded-lg border"
                src={
                  ticket.qrUrl ||
                  `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${ticket.id}`
                }
                alt="QR vé"
              />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
