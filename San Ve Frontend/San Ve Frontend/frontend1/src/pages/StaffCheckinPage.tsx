
import { useEffect, useRef, useState } from 'react';
import { checkInTicket, getTicketByCode } from '../api/ticketApi';
import type { TicketDetail } from '../api/ticketApi';
import { useTheme } from '../context/useTheme';

type Result =
  | { kind: 'ok'; code: string; at: string }
  | { kind: 'error'; message: string }
  | null;

type GroupQrPayload = {
  type: 'CMC_BOOKING_TICKETS';
  version?: number;
  orderCode?: string;
  seats?: string[];
  ticketCodes: string[];
};

function parseGroupQrPayload(raw: string): GroupQrPayload | null {
  try {
    const payload = JSON.parse(raw) as Partial<GroupQrPayload>;

    if (
      payload.type !== 'CMC_BOOKING_TICKETS' ||
      !Array.isArray(payload.ticketCodes) ||
      payload.ticketCodes.length === 0
    ) {
      return null;
    }

    const ticketCodes = Array.from(
      new Set(
        payload.ticketCodes
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );

    if (!ticketCodes.length) return null;

    return {
      type: 'CMC_BOOKING_TICKETS',
      version: payload.version,
      orderCode: payload.orderCode,
      seats: Array.isArray(payload.seats)
        ? payload.seats.filter((seat): seat is string => typeof seat === 'string')
        : [],
      ticketCodes,
    };
  } catch {
    return null;
  }
}

export default function StaffCheckinPage() {
  const { darkMode } = useTheme();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [preview, setPreview] = useState<TicketDetail | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, [result]);

  const submit = async () => {
    const value = code.trim();
    if (!value || busy) return;

    setBusy(true);
    setPreview(null);
    try {
      const group = parseGroupQrPayload(value);

      if (group) {
        const results = await Promise.all(
          group.ticketCodes.map((ticketCode) => checkInTicket(ticketCode)),
        );

        const lastResult = results[results.length - 1];
        setResult({
          kind: 'ok',
          code:
            group.orderCode ||
            `Đã check-in ${results.length} vé${
              group.seats?.length ? ` · Ghế ${group.seats.join(', ')}` : ''
            }`,
          at: lastResult?.checkedInAt || new Date().toISOString(),
        });
        setCode('');
      } else {
        const res = await checkInTicket(value);
        setResult({ kind: 'ok', code: res.ticketCode, at: res.checkedInAt });
        setCode('');
      }
    } catch (err) {
      const message = (err as Error).message;
      setResult({ kind: 'error', message });

      if (!parseGroupQrPayload(value)) {
        try {
          setPreview(await getTicketByCode(value));
        } catch {
          setPreview(null);
        }
      } else {
        setPreview(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const bg   = darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
  const card = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const muted = darkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`min-h-screen ${bg}`}>
      <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">✅ Soát vé tại rạp</h1>
          <p className={`text-sm mt-1 ${muted}`}>
            Quét QR, nhập mã vé TICKET-... hoặc mã đơn BK-..., rồi nhấn Enter.
          </p>
        </div>

        <div className={`rounded-2xl border p-5 space-y-3 ${card}`}>
          <label className="text-xs uppercase tracking-wider font-semibold block">
            Mã vé
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
              placeholder="TICKET-... hoặc BK-..."
              disabled={busy}
              className={`flex-1 min-w-0 px-3 py-3 rounded-xl font-mono text-sm border outline-none focus:ring-2 focus:ring-green-500/50 ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 placeholder-gray-500'
                  : 'bg-white border-gray-300 placeholder-gray-400'
              }`}
            />
            <button
              onClick={() => void submit()}
              disabled={busy || !code.trim()}
              className={`px-5 rounded-xl font-bold text-sm transition ${
                busy || !code.trim()
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-500 text-white active:scale-95'
              }`}
            >
              {busy ? '…' : 'Check-in'}
            </button>
          </div>
        </div>

        {result?.kind === 'ok' && (
          <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-6 text-center space-y-2">
            <div className="text-5xl">✅</div>
            <p className="text-lg font-bold text-green-500">Check-in thành công</p>
            <p className="font-mono text-sm">{result.code}</p>
            <p className={`text-xs ${muted}`}>
              {new Date(result.at).toLocaleString('vi-VN')}
            </p>
          </div>
        )}

        {result?.kind === 'error' && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center space-y-2">
            <div className="text-5xl">⛔</div>
            <p className="text-lg font-bold text-red-500">Không hợp lệ</p>
            <p className="text-sm">{result.message}</p>

            {preview && (
              <div className={`text-xs pt-2 space-y-0.5 ${muted}`}>
                <p>Trạng thái vé: <strong>{preview.ticketStatus}</strong></p>
                {preview.checkedInAt && (
                  <p>
                    Đã soát lúc:{' '}
                    <strong>{new Date(preview.checkedInAt).toLocaleString('vi-VN')}</strong>
                  </p>
                )}
                {preview.checkedInBy != null && (
                  <p>Nhân viên soát: <strong>#{preview.checkedInBy}</strong></p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
