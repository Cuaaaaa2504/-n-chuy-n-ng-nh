import { useCallback, useEffect, useRef, useState } from "react";

export interface Seat {
  seatId: number;
  seatCode: string;
  price: number;
  status: "AVAILABLE" | "HELD" | "SOLD" | "BLOCKED";
}

const MOCK_SEATS: Seat[] = [
  { seatId: 1,  seatCode: "A1", price: 50000, status: "AVAILABLE" },
  { seatId: 2,  seatCode: "A2", price: 50000, status: "AVAILABLE" },
  { seatId: 3,  seatCode: "A3", price: 50000, status: "AVAILABLE" },
  { seatId: 4,  seatCode: "A4", price: 50000, status: "AVAILABLE" },
  { seatId: 5,  seatCode: "B1", price: 60000, status: "AVAILABLE" },
  { seatId: 6,  seatCode: "B2", price: 60000, status: "AVAILABLE" },
  { seatId: 7,  seatCode: "B3", price: 60000, status: "AVAILABLE" },
  { seatId: 8,  seatCode: "B4", price: 60000, status: "AVAILABLE" },
  { seatId: 9,  seatCode: "C1", price: 70000, status: "AVAILABLE" },
  { seatId: 10, seatCode: "C2", price: 70000, status: "AVAILABLE" },
  { seatId: 11, seatCode: "C3", price: 70000, status: "AVAILABLE" },
  { seatId: 12, seatCode: "C4", price: 70000, status: "AVAILABLE" },
];

export function useSeatHold(showtimeId?: string) {
  const [seats, setSeats]                   = useState<Seat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [holdExpiresAt, setHoldExpiresAt]   = useState<string | null>(null);
  const [countdown, setCountdown]           = useState(0);
  const [loading, setLoading]               = useState(false);
  const [message, setMessage]               = useState("");
  const [error, setError]                   = useState("");

  // ✅ FIX 1: countdown tính bằng useEffect+setInterval, không dùng useMemo với Date.now() (impure)
  useEffect(() => {
    if (!holdExpiresAt) {
      setCountdown(0);
      return;
    }
    const calc = () =>
      Math.max(0, Math.floor((new Date(holdExpiresAt).getTime() - Date.now()) / 1000));

    setCountdown(calc());
    const id = setInterval(() => {
      const s = calc();
      setCountdown(s);
      if (s === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [holdExpiresAt]);

  // ✅ FIX 2: load seats trong async function có cancelled flag, không setSeats sync
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // Replace with actual API call when backend is ready:
      // const data = await seatApi.getByShowtime(showtimeId);
      await Promise.resolve();
      if (!cancelled) setSeats(MOCK_SEATS);
    };
    void load();
    return () => { cancelled = true; };
  }, [showtimeId]);

  // ✅ FIX 3: reset khi hết giờ — bọc setState trong setTimeout(0) tránh sync setState in effect
  const resetFiredRef = useRef(false);
  useEffect(() => {
    if (countdown !== 0 || !holdExpiresAt) {
      resetFiredRef.current = false;
      return;
    }
    if (resetFiredRef.current) return;
    resetFiredRef.current = true;

    const id = setTimeout(() => {
      setSelectedSeatIds([]);
      setHoldExpiresAt(null);
      setMessage("Hết thời gian giữ ghế.");
      setSeats((prev) =>
        prev.map((seat) =>
          seat.status === "HELD" ? { ...seat, status: "AVAILABLE" } : seat
        )
      );
    }, 0);
    return () => clearTimeout(id);
  }, [countdown, holdExpiresAt]);

  const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s.seatId));
  const totalPrice    = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

  const toggleSeat = useCallback((seat: Seat) => {
    if (seat.status !== "AVAILABLE") return;
    setSelectedSeatIds((prev) =>
      prev.includes(seat.seatId)
        ? prev.filter((id) => id !== seat.seatId)
        : [...prev, seat.seatId]
    );
  }, []);

  const holdSeats = useCallback(async () => {
    if (selectedSeatIds.length === 0) return;

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const conflict = Math.random() < 0.1;
      if (conflict) {
        throw Object.assign(new Error("Ghế đã bị người khác giữ."), { status: 409 });
      }

      const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      setSeats((prev) =>
        prev.map((seat) =>
          selectedSeatIds.includes(seat.seatId) ? { ...seat, status: "HELD" } : seat
        )
      );
      setHoldExpiresAt(expires);
      setMessage("Giữ ghế thành công.");
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      if (err.status === 409) {
        setError("Ghế đã bị người khác giữ. Vui lòng chọn lại.");
        setSelectedSeatIds([]);
        setSeats((prev) => prev.map((seat) => ({ ...seat })));
        return;
      }
      setError(err.message ?? "Không thể giữ ghế.");
    } finally {
      setLoading(false);
    }
  }, [selectedSeatIds]);

  return {
    seats,
    selectedSeatIds,
    selectedSeats,
    totalPrice,
    countdown,
    loading,
    message,
    error,
    toggleSeat,
    holdSeats,
  };
}
