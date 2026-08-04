import HoldCountdown from './HoldCountdown';
import type { Seat } from '../hooks/useSeatHold';

interface FullProps {
  selectedSeats: Seat[];
  totalPrice: number;
  countdown: number;
  loading: boolean;
  message: string;
  error: string;
  heldSeatCodes: string[];
  onHold: () => void;
  seats?: never;
  total?: never;
}

interface SimpleProps {
  seats: Seat[];
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

const formatMoney = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;

export default function SelectedSeatsBar(props: Props) {
  const selectedSeats: Seat[] =
    'seats' in props && props.seats
      ? props.seats
      : ((props as FullProps).selectedSeats ?? []);

  const totalPrice = props.totalPrice ?? 0;
  const countdown =
    'countdown' in props ? ((props as FullProps).countdown ?? 0) : 0;
  const loading =
    'loading' in props
      ? ((props as FullProps).loading ?? false)
      : ((props as SimpleProps).holding ?? false);
  const message =
    'message' in props ? ((props as FullProps).message ?? '') : '';
  const error = 'error' in props ? ((props as FullProps).error ?? '') : '';
  const heldSeatCodes =
    'heldSeatCodes' in props
      ? ((props as FullProps).heldSeatCodes ?? [])
      : [];

  const holdCountdown =
    'holdCountdown' in props
      ? ((props as SimpleProps).holdCountdown ?? null)
      : null;
  const onHoldSimple =
    'onHold' in props && typeof (props as SimpleProps).onHold === 'function'
      ? (props as SimpleProps).onHold!
      : null;
  const onProceed =
    'onProceed' in props ? (props as SimpleProps).onProceed : undefined;
  const navigating =
    'navigating' in props
      ? ((props as SimpleProps).navigating ?? false)
      : false;

  const isSimple = 'seats' in props && props.seats !== undefined;
  const onHoldFull =
    'onHold' in props && !isSimple ? (props as FullProps).onHold : () => {};

  if (isSimple) {
    const selectedCodes = selectedSeats.map((seat) => seat.seatCode).filter(Boolean);

    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-secondary/20 bg-[#05070d]/90 px-4 py-3 shadow-[0_-18px_55px_rgba(0,0,0,0.5)] backdrop-blur-2xl lg:hidden">
        <div className="mx-auto max-w-container-max">
          {holdCountdown !== null && holdCountdown > 0 && (
            <div className="mb-2 flex items-center justify-center gap-2 font-label-sm text-[11px] uppercase tracking-[0.14em] text-tertiary">
              <span className="material-symbols-outlined text-[17px]">timer</span>
              Giữ ghế còn {Math.floor(holdCountdown / 60)}:
              {String(holdCountdown % 60).padStart(2, '0')}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-label-sm text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
                {selectedSeats.length > 0
                  ? `${selectedSeats.length} ghế đã chọn`
                  : 'Chưa chọn ghế'}
              </p>
              {selectedCodes.length > 0 && (
                <p className="max-w-[46vw] truncate text-xs text-secondary">
                  {selectedCodes.join(', ')}
                </p>
              )}
              <p className="text-lg font-extrabold text-tertiary drop-shadow-[0_0_9px_rgba(231,231,133,0.25)]">
                {formatMoney(totalPrice)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {onHoldSimple && (
                <button
                  type="button"
                  onClick={() => {
                    void onHoldSimple();
                  }}
                  disabled={loading || selectedSeats.length === 0}
                  className="btn-secondary min-h-11 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? 'Đang giữ…' : 'Giữ ghế'}
                </button>
              )}

              {onProceed && (
                <button
                  type="button"
                  onClick={() => {
                    void onProceed();
                  }}
                  disabled={loading || navigating || selectedSeats.length === 0}
                  className="btn-primary min-h-11 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="relative z-10 inline-flex items-center gap-1">
                    {loading ? 'Đang giữ…' : navigating ? 'Đang tạo đơn…' : 'Đặt vé'}
                    {!loading && !navigating && (
                      <span className="material-symbols-outlined text-[17px]">
                        arrow_forward
                      </span>
                    )}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside className="space-y-4">
      <section className="glass-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-label-sm text-[10px] uppercase tracking-[0.16em] text-secondary">
              Lựa chọn của bạn
            </p>
            <h2 className="font-title-md text-lg font-bold text-on-surface">
              Ghế đã chọn
            </h2>
          </div>
          <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 px-2 font-bold text-primary">
            {selectedSeats.length}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          {selectedSeats.length > 0 ? (
            selectedSeats.map((seat) => (
              <div
                key={seat.seatId}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.025] px-3 py-2"
              >
                <span className="font-semibold text-secondary">{seat.seatCode}</span>
                <span className="text-on-surface-variant">
                  {formatMoney(seat.price)}
                </span>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-outline-variant px-3 py-5 text-center text-on-surface-variant">
              Chưa chọn ghế nào.
            </div>
          )}
        </div>
      </section>

      <section className="glass-card p-5">
        <p className="font-label-sm text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
          Tổng thanh toán
        </p>
        <p className="mt-1 text-3xl font-extrabold text-tertiary drop-shadow-[0_0_12px_rgba(231,231,133,0.2)]">
          {formatMoney(totalPrice)}
        </p>
      </section>

      <div className="glass-card p-4">
        <HoldCountdown countdown={countdown} />
      </div>

      <button
        type="button"
        onClick={onHoldFull}
        disabled={loading || selectedSeats.length === 0}
        className="btn-primary w-full rounded-xl py-3.5 font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="relative z-10 inline-flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">lock_clock</span>
          {loading ? 'Đang giữ ghế...' : 'Giữ ghế'}
        </span>
      </button>

      {message && (
        <p className="rounded-lg border border-secondary/30 bg-secondary/10 px-3 py-2 text-sm text-secondary">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}
      {heldSeatCodes.length > 0 && (
        <p className="text-sm text-on-surface-variant">
          Đã giữ: <span className="font-semibold text-tertiary">{heldSeatCodes.join(', ')}</span>
        </p>
      )}
    </aside>
  );
}
