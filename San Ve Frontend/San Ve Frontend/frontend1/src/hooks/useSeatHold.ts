import { useCallback, useEffect, useMemo, useState } from "react";

export interface Seat {
  seatId: number;
  seatCode: string;
  price: number;
  status: "AVAILABLE" | "HELD" | "SOLD" | "BLOCKED";
}

const MOCK_SEATS: Seat[] = [
  { seatId: 1, seatCode: "A1", price: 50000, status: "AVAILABLE" },
  { seatId: 2, seatCode: "A2", price: 50000, status: "AVAILABLE" },
  { seatId: 3, seatCode: "A3", price: 50000, status: "AVAILABLE" },
  { seatId: 4, seatCode: "A4", price: 50000, status: "AVAILABLE" },
  { seatId: 5, seatCode: "B1", price: 60000, status: "AVAILABLE" },
  { seatId: 6, seatCode: "B2", price: 60000, status: "AVAILABLE" },
  { seatId: 7, seatCode: "B3", price: 60000, status: "AVAILABLE" },
  { seatId: 8, seatCode: "B4", price: 60000, status: "AVAILABLE" },
  { seatId: 9, seatCode: "C1", price: 70000, status: "AVAILABLE" },
  { seatId: 10, seatCode: "C2", price: 70000, status: "AVAILABLE" },
  { seatId: 11, seatCode: "C3", price: 70000, status: "AVAILABLE" },
  { seatId: 12, seatCode: "C4", price: 70000, status: "AVAILABLE" },
];

export function useSeatHold(showtimeId?: string) {
  const [seats, setSeats] = useState<Seat[]>(MOCK_SEATS);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const countdown = useMemo(() => {
    if (!holdExpiresAt) return 0;
    return Math.max(
      0,
      Math.floor((new Date(holdExpiresAt).getTime() - Date.now()) / 1000)
    );
  }, [holdExpiresAt]);

  const selectedSeats = useMemo(
    () => seats.filter((s) => selectedSeatIds.includes(s.seatId)),
    [seats, selectedSeatIds]
  );

  const totalPrice = useMemo(
    () => selectedSeats.reduce((sum, seat) => sum + seat.price, 0),
    [selectedSeats]
  );

  useEffect(() => {
    setSeats(MOCK_SEATS);
  }, [showtimeId]);

  useEffect(() => {
    if (countdown !== 0 || !holdExpiresAt) return;

    setSelectedSeatIds([]);
    setHoldExpiresAt(null);
    setMessage("Hết thời gian giữ ghế.");
    setSeats((prev) =>
      prev.map((seat) =>
        seat.status === "HELD" ? { ...seat, status: "AVAILABLE" } : seat
      )
    );
  }, [countdown, holdExpiresAt]);

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
        throw Object.assign(new Error("Ghế đã bị người khác giữ."), {
          status: 409,
        });
      }

      const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      setSeats((prev) =>
        prev.map((seat) =>
          selectedSeatIds.includes(seat.seatId)
            ? { ...seat, status: "HELD" }
            : seat
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
