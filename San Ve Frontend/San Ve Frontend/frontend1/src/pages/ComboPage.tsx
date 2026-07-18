// src/pages/ComboPage.tsx
//
// Bước "Chọn combo bắp nước" — nằm GIỮA SeatBookingPage và PaymentPage.
// Luồng đúng: Chọn ghế → Giữ ghế → Đặt vé → [ComboPage] → tạo booking → Thanh toán.
//
// Booking được tạo TẠI ĐÂY (không phải ở SeatBookingPage) để vé và bắp nước nằm
// trong cùng một đơn hàng: POST /bookings { holdIds, products }.
//
// ⚠️ Backend resolve `products[].productId` theo bảng `concession_combos`
// (BookingService dùng Repository<ConcessionCombo>, khớp `comboId`), nên trang này
// đọc từ GET /api/concession-combos chứ KHÔNG phải GET /products.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import axiosClient from '../api/axiosClient';

// ===== Types =====
interface ComboItem {
  comboId: number;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  status?: string;
}

interface HoldFromApi {
  holdId: string;
  expiresAt: string;
  status: string;
  seatLabel?: string;
  price?: number;
  showtimeInfo?: { movieTitle?: string; cinemaName?: string };
}

interface CreateBookingResponse {
  bookingId: string;
  bookingCode: string;
}

/** State được SeatBookingPage đẩy sang qua navigate('/combo', { state }) */
interface ComboNavState {
  holdIds: number[];
  holdExpiresAt?: string | null;
  showtimeId?: number;
  movieTitle?: string;
  posterUrl?: string | null;
  cinemaName?: string | null;
  roomName?: string | null;
  showDate?: string | null;
  showTime?: string | null;
  seatCodes?: string[];
  seatTotal?: number;
}

const FALLBACK_IMG = 'https://picsum.photos/seed/combo/400/300';

function formatVND(amount: number) {
  return amount.toLocaleString('vi-VN') + ' ₫';
}

export default function ComboPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode } = useTheme();

  const navState = (location.state ?? null) as ComboNavState | null;

  const [holdIds, setHoldIds]     = useState<number[]>(navState?.holdIds ?? []);
  const [expiresAt, setExpiresAt] = useState<string | null>(navState?.holdExpiresAt ?? null);
  const [seatCodes, setSeatCodes] = useState<string[]>(navState?.seatCodes ?? []);
  const [seatTotal, setSeatTotal] = useState<number>(navState?.seatTotal ?? 0);
  const [movieTitle, setMovieTitle] = useState<string>(navState?.movieTitle ?? 'Vé xem phim');

  const [combos, setCombos]   = useState<ComboItem[]>([]);
  const [qty, setQty]         = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Chặn double-submit: user bấm "Thanh toán" 2 lần sẽ tạo 2 booking trên cùng holdIds,
  // lần 2 chắc chắn fail (hold đã CONVERTED) và làm người dùng hoang mang.
  const submittingRef = useRef(false);

  // ─── Khôi phục hold khi state bị mất (F5 / mở link trực tiếp) ───────────
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      if (holdIds.length) return;
      try {
        const holds = (await axiosClient.get(
          '/showtime-seats/my-holds/list',
        )) as unknown as HoldFromApi[];

        const active = (Array.isArray(holds) ? holds : []).filter(
          (h) => h.status === 'ACTIVE' && new Date(h.expiresAt).getTime() > Date.now(),
        );

        if (cancelled) return;

        if (!active.length) {
          setError('Không tìm thấy ghế đang giữ. Vui lòng chọn ghế lại.');
          return;
        }

        setHoldIds(active.map((h) => Number(h.holdId)).filter(Number.isFinite));
        setExpiresAt(active[0].expiresAt);
        setSeatCodes(active.map((h) => h.seatLabel ?? '').filter(Boolean));
        setSeatTotal(active.reduce((sum, h) => sum + Number(h.price ?? 0), 0));
        if (active[0].showtimeInfo?.movieTitle) {
          setMovieTitle(active[0].showtimeInfo.movieTitle);
        }
      } catch {
        if (!cancelled) setError('Không khôi phục được thông tin giữ ghế.');
      }
    };

    void restore();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Load danh sách combo ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = (await axiosClient.get(
          '/api/concession-combos',
        )) as unknown as Record<string, unknown>[];

        if (cancelled) return;

        const list: ComboItem[] = (Array.isArray(data) ? data : [])
          .map((c) => ({
            comboId:     Number(c.comboId ?? c.combo_id),
            name:        String(c.name ?? c.comboName ?? c.combo_name ?? 'Combo'),
            description: (c.description ?? null) as string | null,
            price:       Number(c.price ?? 0),
            imageUrl:    (c.imageUrl ?? c.image_url ?? null) as string | null,
            status:      (c.status ?? 'ACTIVE') as string,
          }))
          .filter((c) => Number.isFinite(c.comboId) && c.status === 'ACTIVE');

        setCombos(list);
      } catch {
        // Không có combo cũng không được chặn người dùng thanh toán —
        // đây là bước TÙY CHỌN, chỉ hiện thông báo nhẹ.
        if (!cancelled) setCombos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, []);

  // ─── Countdown theo expiresAt thật của hold ─────────────────────────────
  useEffect(() => {
    if (!expiresAt) return;
    const deadline = new Date(expiresAt).getTime();

    const tick = () => {
      setSecondsLeft(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const expired = secondsLeft !== null && secondsLeft <= 0;

  // ─── Derived ────────────────────────────────────────────────────────────
  const comboTotal = useMemo(
    () =>
      combos.reduce((sum, c) => sum + c.price * (qty[c.comboId] ?? 0), 0),
    [combos, qty],
  );
  const grandTotal = seatTotal + comboTotal;

  const changeQty = (comboId: number, delta: number) => {
    setQty((prev) => {
      const next = Math.max(0, Math.min(20, (prev[comboId] ?? 0) + delta));
      const copy = { ...prev };
      if (next === 0) delete copy[comboId];
      else copy[comboId] = next;
      return copy;
    });
  };

  // ─── Tạo booking rồi sang thanh toán ────────────────────────────────────
  const createBookingAndPay = useCallback(async () => {
    if (submittingRef.current) return;
    if (!holdIds.length) {
      setSubmitError('Không có ghế đang giữ. Vui lòng chọn ghế lại.');
      return;
    }
    if (expired) {
      setSubmitError('Thời gian giữ ghế đã hết. Vui lòng chọn ghế lại.');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const products = (Object.entries(qty) as [string, number][])
        .filter(([, q]) => q > 0)
        .map(([id, q]) => ({ productId: Number(id), quantity: q }));

      // CreateBookingRequest: { holdIds, voucherCode?, promotionId?, idempotencyKey?, products? }
      // forbidNonWhitelisted đang bật -> tuyệt đối không gửi field thừa.
      const body: Record<string, unknown> = { holdIds };
      if (products.length) body.products = products;

      const booking = (await axiosClient.post(
        '/bookings',
        body,
      )) as unknown as CreateBookingResponse;

      if (!booking?.bookingId) {
        setSubmitError('Không tạo được đơn hàng. Vui lòng thử lại.');
        return;
      }

      navigate(`/payment/${booking.bookingId}`, { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ?? 'Có lỗi xảy ra. Vui lòng thử lại.';
      setSubmitError(msg);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [holdIds, qty, expired, navigate]);

  // ─── Theme tokens ───────────────────────────────────────────────────────
  const bg        = darkMode ? 'bg-gray-950 text-white'      : 'bg-gray-50 text-gray-900';
  const card      = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const cardMuted = darkMode ? 'text-gray-400'               : 'text-gray-500';
  const divider   = darkMode ? 'border-gray-700'             : 'border-gray-200';

  const mm = secondsLeft !== null ? String(Math.floor(secondsLeft / 60)).padStart(2, '0') : '--';
  const ss = secondsLeft !== null ? String(secondsLeft % 60).padStart(2, '0') : '--';

  // ─── Không có hold hợp lệ ───────────────────────────────────────────────
  if (error && !holdIds.length) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${bg}`}>
        <div className={`max-w-md w-full rounded-2xl border ${card} p-6 text-center space-y-4`}>
          <div className="text-4xl">🎟️</div>
          <p className="font-semibold">{error}</p>
          <button
            onClick={() => navigate('/movies')}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold"
          >
            Chọn phim khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg}`}>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Header: các bước ── */}
        <div className="flex items-center gap-2 text-xs font-semibold flex-wrap">
          <span className={cardMuted}>1. Chọn ghế</span>
          <span className={cardMuted}>›</span>
          <span className="text-amber-500">2. Combo bắp nước</span>
          <span className={cardMuted}>›</span>
          <span className={cardMuted}>3. Thanh toán</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── Danh sách combo ── */}
          <div className="flex-1 min-w-0 space-y-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Chọn combo bắp nước</h1>
              <p className={`text-sm mt-1 ${cardMuted}`}>
                Bước này không bắt buộc — bạn có thể bỏ qua và thanh toán ngay.
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : combos.length === 0 ? (
              <div className={`rounded-xl px-4 py-8 text-center border ${card} ${cardMuted} text-sm`}>
                🍿 Hiện chưa có combo nào. Bạn có thể tiếp tục thanh toán vé.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {combos.map((c) => {
                  const q = qty[c.comboId] ?? 0;
                  return (
                    <div
                      key={c.comboId}
                      className={`rounded-2xl border overflow-hidden transition-all ${card} ${
                        q > 0 ? 'ring-2 ring-amber-500' : ''
                      }`}
                    >
                      <img
                        src={c.imageUrl || FALLBACK_IMG}
                        alt={c.name}
                        className="w-full h-36 object-cover"
                        onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                      />
                      <div className="p-4 space-y-2">
                        <h3 className="font-semibold leading-tight">{c.name}</h3>
                        {c.description && (
                          <p className={`text-xs leading-relaxed ${cardMuted}`}>{c.description}</p>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-bold text-amber-500">{formatVND(c.price)}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => changeQty(c.comboId, -1)}
                              disabled={q === 0}
                              aria-label={`Bớt ${c.name}`}
                              className={`w-8 h-8 rounded-lg font-bold transition ${
                                q === 0
                                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                  : 'bg-gray-700 hover:bg-gray-600 text-white active:scale-95'
                              }`}
                            >
                              −
                            </button>
                            <span className="w-6 text-center font-bold tabular-nums">{q}</span>
                            <button
                              onClick={() => changeQty(c.comboId, 1)}
                              aria-label={`Thêm ${c.name}`}
                              className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold active:scale-95 transition"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Panel tóm tắt ── */}
          <div className={`w-full lg:w-80 rounded-2xl border ${card} p-5 space-y-4 sticky top-4`}>
            <h2 className="text-base font-bold">Tóm tắt đơn hàng</h2>

            {/* Countdown giữ ghế */}
            <div
              className={`rounded-xl px-4 py-3 text-center font-mono font-bold text-lg border ${
                expired
                  ? 'bg-red-500/10 border-red-500/30 text-red-500'
                  : secondsLeft !== null && secondsLeft < 60
                    ? 'bg-red-500/10 border-red-500/30 text-red-500'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
              }`}
            >
              <div className="text-xs font-sans font-normal mb-0.5 opacity-70">
                Thời gian giữ ghế
              </div>
              {expired ? '⌛ Đã hết hạn' : `⏳ ${mm}:${ss}`}
            </div>

            <div className="space-y-1">
              <div className={`text-xs uppercase tracking-wider font-semibold ${cardMuted}`}>
                Phim
              </div>
              <p className="font-medium text-sm">{movieTitle}</p>
              {navState?.cinemaName && (
                <p className={`text-xs ${cardMuted}`}>🎬 {navState.cinemaName}</p>
              )}
              {(navState?.showDate || navState?.showTime) && (
                <p className={`text-xs ${cardMuted}`}>
                  📅 {navState?.showDate ?? ''} {navState?.showTime ?? ''}
                </p>
              )}
            </div>

            {seatCodes.length > 0 && (
              <div className="space-y-1.5">
                <div className={`text-xs uppercase tracking-wider font-semibold ${cardMuted}`}>
                  Ghế ({seatCodes.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {seatCodes.map((code) => (
                    <span
                      key={code}
                      className="text-xs px-2 py-1 rounded-lg font-medium bg-green-500/20 text-green-500 border border-green-500/30"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className={`border-t ${divider}`} />

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className={cardMuted}>Tiền vé</span>
                <span className="font-medium">{formatVND(seatTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={cardMuted}>Bắp nước</span>
                <span className="font-medium">{formatVND(comboTotal)}</span>
              </div>
              <div className={`border-t ${divider} pt-2 flex items-center justify-between`}>
                <span className="font-semibold">Tổng cộng</span>
                <span className="text-lg font-bold text-amber-500">{formatVND(grandTotal)}</span>
              </div>
            </div>

            {submitError && (
              <div className="rounded-lg px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {submitError}
              </div>
            )}

            <button
              onClick={createBookingAndPay}
              disabled={submitting || expired || !holdIds.length}
              className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
                submitting || expired || !holdIds.length
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-gray-950 active:scale-95 shadow-lg shadow-amber-500/20'
              }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                  Đang tạo đơn hàng…
                </span>
              ) : comboTotal > 0 ? 'Tiếp tục thanh toán →' : 'Bỏ qua & thanh toán →'}
            </button>

            <button
              onClick={() => navigate(-1)}
              disabled={submitting}
              className={`w-full py-2 rounded-xl text-xs font-semibold ${cardMuted} hover:underline`}
            >
              ← Quay lại chọn ghế
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
