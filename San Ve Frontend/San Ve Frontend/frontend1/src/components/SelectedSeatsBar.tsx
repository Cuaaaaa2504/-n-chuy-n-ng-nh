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
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-secondary/20 bg-[#0b0f18]/92 px-4 py-3 shadow-[0_-16px_45px_rgba(0,0,0,0.48)] backdrop-blur-2xl lg:hidden">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4">
          <div className="min-w-0">
            {holdCountdown !== null && holdCountdown > 0 && (
              <p className="mb-1 font-label-sm text-[10px] uppercase tracking-[0.14em] text-tertiary">
                Giữ ghế còn {Math.floor(holdCountdown / 60)}:{String(holdCountdown % 60).padStart(2, '0')}
              </p>
            )}
            <p className="text-xs text-on-surface-variant">Đã chọn {selectedSeats.length} ghế</p>
            <p className="truncate text-lg font-extrabold text-tertiary drop-shadow-[0_0_8px_rgba(231,231,133,0.2)]">
              {totalPrice.toLocaleString('vi-VN')} ₫
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {onHoldSimple && (
              <button
                onClick={() => { void onHoldSimple(); }}
                disabled={loading || selectedSeats.length === 0}
                className="btn-secondary rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-outline"
              >
                {loading ? 'Đang giữ…' : 'Giữ ghế'}
              </button>
            )}
            {onProceed && (
              <button
                onClick={() => { void onProceed(); }}
                disabled={navigating || selectedSeats.length === 0}
                className="btn-primary inline-flex items-center gap-1 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:bg-none disabled:bg-white/[0.06] disabled:text-outline disabled:shadow-none"
              >
                {navigating ? 'Đang chuyển…' : (
                  <>
                    Đặt vé
                    <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                  </>
                )}
              </button>
            )}
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
