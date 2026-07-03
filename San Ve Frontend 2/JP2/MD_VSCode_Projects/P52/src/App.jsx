import { useEffect, useMemo, useRef, useState } from 'react';
import { getSeatMap, holdSeats, releaseSeats, isSeatUnavailableError } from './services/seatService';
import './styles.css';

const SHOWTIME_ID = 'demo-showtime-1';
const HOLD_SECONDS = 300;
const fallbackSeats = Array.from({ length: 30 }, (_, i) => ({ id: `S${i + 1}`, code: `S${i + 1}`, status: 'AVAILABLE' }));

export default function App() {
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [hold, setHold] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const holdRef = useRef(null);
  holdRef.current = hold;

  const selectedSeats = useMemo(() => seats.filter((seat) => selected.includes(seat.id)), [seats, selected]);

  async function loadSeats() {
    try {
      const data = await getSeatMap(SHOWTIME_ID);
      setSeats(data.length ? data : fallbackSeats);
    } catch {
      setSeats(fallbackSeats);
    }
  }

  useEffect(() => {
    loadSeats();
    const pollId = setInterval(loadSeats, 10000);
    return () => clearInterval(pollId);
  }, []);

  useEffect(() => {
    if (!secondsLeft) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0 && holdRef.current) handleRelease();
  }, [secondsLeft]);

  useEffect(() => {
    return () => {
      const currentHold = holdRef.current;
      if (currentHold) releaseSeats({ holdId: currentHold.holdId, showtimeId: SHOWTIME_ID, seatIds: currentHold.seatIds });
    };
  }, []);

  const toggleSeat = (seat) => {
    if (seat.status && seat.status !== 'AVAILABLE') return;
    if (hold) return setError('Bạn cần nhả ghế hiện tại trước khi chọn lại.');
    setSelected((prev) => prev.includes(seat.id) ? prev.filter((id) => id !== seat.id) : [...prev, seat.id]);
  };

  async function handleHold() {
    setLoading(true); setError('');
    try {
      const data = await holdSeats({ showtimeId: SHOWTIME_ID, seatIds: selected });
      setHold({ holdId: data.holdId || data.data?.holdId, seatIds: selected });
      setSecondsLeft(data.expiresIn || HOLD_SECONDS);
    } catch (err) {
      setError(isSeatUnavailableError(err) ? 'Ghế vừa được người khác giữ, vui lòng chọn ghế khác.' : err.message);
      loadSeats();
    } finally { setLoading(false); }
  }

  async function handleRelease() {
    const current = holdRef.current;
    if (!current) return;
    await releaseSeats({ holdId: current.holdId, showtimeId: SHOWTIME_ID, seatIds: current.seatIds }).catch(() => null);
    setHold(null); setSelected([]); setSecondsLeft(0); loadSeats();
  }

  return (
    <main className="container">
      <h1>Chọn ghế</h1>
      <p>Polling sơ đồ ghế mỗi 10 giây, có giữ ghế, nhả ghế và đếm ngược phía client.</p>
      {error && <p className="error">{error}</p>}
      <div className="seat-grid">
        {seats.map((seat) => (
          <button key={seat.id} className={`seat ${selected.includes(seat.id) ? 'selected' : ''} ${seat.status !== 'AVAILABLE' ? 'disabled' : ''}`} onClick={() => toggleSeat(seat)}>
            {seat.code || seat.name || seat.id}
          </button>
        ))}
      </div>
      <section className="panel">
        <p>Ghế đã chọn: {selectedSeats.map((s) => s.code || s.id).join(', ') || 'Chưa chọn'}</p>
        {hold && <p>Thời gian giữ ghế còn lại: <b>{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</b></p>}
        {!hold ? <button disabled={!selected.length || loading} onClick={handleHold}>{loading ? 'Đang giữ ghế...' : 'Giữ ghế'}</button> : <button onClick={handleRelease}>Nhả ghế</button>}
      </section>
    </main>
  );
}
