import HoldCountdown from "./HoldCountdown";
import type { Seat } from "../hooks/useSeatHold";

interface Props {
  selectedSeats: Seat[];
  totalPrice: number;
  countdown: number;
  loading: boolean;
  message: string;
  error: string;
  heldSeatCodes: string[];
  onHold: () => void;
}

export default function SelectedSeatsBar({
  selectedSeats,
  totalPrice,
  countdown,
  loading,
  message,
  error,
  heldSeatCodes,
  onHold,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-4">
        <h2 className="font-bold mb-2">Ghế đã chọn</h2>
        <div className="space-y-1 text-sm">
          {selectedSeats.length > 0 ? (
            selectedSeats.map((s) => (
              <div key={s.seatId} className="flex justify-between">
                <span>{s.seatCode}</span>
                <span>{s.price.toLocaleString("vi-VN")} đ</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500">Chưa chọn ghế nào.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <h2 className="font-bold mb-2">Tổng tiền</h2>
        <p className="text-2xl font-extrabold text-blue-600">
          {totalPrice.toLocaleString("vi-VN")} đ
        </p>
      </div>

      <HoldCountdown countdown={countdown} />

      <button
        onClick={onHold}
        disabled={loading || selectedSeats.length === 0}
        className="w-full rounded-xl bg-blue-600 text-white font-bold py-3 disabled:opacity-50"
      >
        {loading ? "Đang giữ ghế..." : "Giữ ghế"}
      </button>

      {message && <p className="text-green-600 text-sm">{message}</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {heldSeatCodes.length > 0 && (
        <p className="text-sm text-gray-600">
          Đã giữ: {heldSeatCodes.join(", ")}
        </p>
      )}
    </div>
  );
}
