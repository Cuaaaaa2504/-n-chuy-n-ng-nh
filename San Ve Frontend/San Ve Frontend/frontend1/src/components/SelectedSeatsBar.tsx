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
  // FIX TS2322: totalPrice thay vì total để khớp với cách SeatBookingPage truyền vào
  totalPrice: number;
  holdCountdown?: number | null;
  onHold?: () => Promise<void>;
  onProceed?: () => Promise<void>;
  holding?: boolean;
  navigating?: boolean;
  selectedSeats?: never;
  total?: never;
  countdown?: never;
  loading?: never;
  message?: never;
  error?: never;
  heldSeatCodes?: never;
}

type Props = FullProps | SimpleProps;

export default function SelectedSeatsBar(props: Props) {
  // Normalise: chấp nhận cả hai dạng props
  const selectedSeats: Seat[] =
    'seats' in props && props.seats ? props.seats : ((props as FullProps).selectedSeats ?? []);
  const totalPrice: number =
    'totalPrice' in props && props.totalPrice !== undefined ? props.totalPrice : 0;
  const countdown   = 'countdown' in props ? ((props as FullProps).countdown ?? 0) : 0;
  const loading     = 'loading'   in props ? ((props as FullProps).loading ?? false) : ((props as SimpleProps).holding ?? false);
  const message     = 'message'   in props ? ((props as FullProps).message ?? '') : '';
  const error       = 'error'     in props ? ((props as FullProps).error ?? '') : '';
  const heldSeatCodes = 'heldSeatCodes' in props ? ((props as FullProps).heldSeatCodes ?? []) : [];

  // SimpleProps actions
  const holdCountdown = 'holdCountdown' in props ? (props as SimpleProps).holdCountdown ?? null : null;
  const onHoldSimple  = 'onHold' in props && typeof (props as SimpleProps).onHold === 'function'
    ? (props as SimpleProps).onHold!
    : null;
  const onProceed     = 'onProceed' in props ? (props as SimpleProps).onProceed : undefined;
  const navigating    = 'navigating' in props ? (props as SimpleProps).navigating ?? false : false;

  const isSimple = 'seats' in props && props.seats !== undefined;

  // Handler cho FullProps onHold (sync)
  const onHoldFull = 'onHold' in props && !isSimple ? (props as FullProps).onHold : () => {};

  if (isSimple) {
    // ── Render đơn giản dùng trong SeatBookingPage ──────────────────
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 px-4 py-4">
        <div className="max-w-5xl mx-auto space-y-3">
          {holdCountdown !== null && holdCountdown > 0 && (
            <div className="text-sm text-amber-400 text-center">
              ⏱ Giữ ghế còn: {Math.floor(holdCountdown / 60)}:{String(holdCountdown % 60).padStart(2, '0')}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Đã chọn {selectedSeats.length} ghế</p>
              <p className="text-lg font-bold text-amber-400">{totalPrice.toLocaleString('vi-VN')} đ</p>
            </div>
            <div className="flex gap-2">
              {onHoldSimple && (
                <button
                  onClick={() => { void onHoldSimple(); }}
                  disabled={loading || selectedSeats.length === 0}
                  className="px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
                >
                  {loading ? 'Đang giữ…' : 'Giữ ghế'}
                </button>
              )}
              {onProceed && (
                <button
                  onClick={() => { void onProceed(); }}
                  disabled={navigating || selectedSeats.length === 0}
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-bold text-sm transition-colors"
                >
                  {navigating ? 'Đang chuyển…' : 'Đặt vé →'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render đầy đủ dùng bởi các component khác ──────────────────────
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
        onClick={onHoldFull}
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
