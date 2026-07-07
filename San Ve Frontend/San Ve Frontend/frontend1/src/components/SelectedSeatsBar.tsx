import HoldCountdown from "./HoldCountdown";
import type { Seat } from "../hooks/useSeatHold";

// Props gốc (dùng bởi các component khác)
interface FullProps {
  selectedSeats: Seat[];
  totalPrice: number;
  countdown: number;
  loading: boolean;
  message: string;
  error: string;
  heldSeatCodes: string[];
  onHold: () => void;
  // FIX TS2322: thêm alias props để tương thích với SeatBookingPage
  seats?: never;
  total?: never;
}

// Props rút gọn dùng trong SeatBookingPage
interface SimpleProps {
  seats: Seat[];
  total: number;
  selectedSeats?: never;
  totalPrice?: never;
  countdown?: never;
  loading?: never;
  message?: never;
  error?: never;
  heldSeatCodes?: never;
  onHold?: never;
}

type Props = FullProps | SimpleProps;

export default function SelectedSeatsBar(props: Props) {
  // Normalise: chấp nhận cả hai dạng props
  const selectedSeats: Seat[] =
    'seats' in props && props.seats ? props.seats : (props.selectedSeats ?? []);
  const totalPrice: number =
    'total' in props && props.total !== undefined ? props.total : (props.totalPrice ?? 0);
  const countdown   = 'countdown'    in props ? (props.countdown   ?? 0)   : 0;
  const loading     = 'loading'      in props ? (props.loading     ?? false): false;
  const message     = 'message'      in props ? (props.message     ?? '')   : '';
  const error       = 'error'        in props ? (props.error       ?? '')   : '';
  const heldSeatCodes = 'heldSeatCodes' in props ? (props.heldSeatCodes ?? []) : [];
  const onHold      = 'onHold'       in props ? (props.onHold ?? (() => {})) : () => {};

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
      {error   && <p className="text-red-600 text-sm">{error}</p>}
      {heldSeatCodes.length > 0 && (
        <p className="text-sm text-gray-600">
          Đã giữ: {heldSeatCodes.join(", ")}
        </p>
      )}
    </div>
  );
}
