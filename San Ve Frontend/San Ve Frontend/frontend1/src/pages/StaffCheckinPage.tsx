// src/pages/StaffCheckinPage.tsx
//
// FIX [mục 7.2 của báo cáo] — trang này TRƯỚC ĐÂY KHÔNG TỒN TẠI.
//
// Báo cáo gọi đây là "lỗ hổng nghiệp vụ cốt lõi", và đúng như vậy: backend có
// `POST /tickets/:code/checkin` với guard STAFF/ADMIN đầy đủ, nhưng không có
// màn hình nào gọi tới. Nhân viên tại rạp không có công cụ xác minh vé — vé in
// ra không ai soát được, và trạng thái vé vĩnh viễn nằm ở VALID.
//
// Thiết kế cho hoàn cảnh dùng thật ở quầy: một ô nhập duy nhất luôn được
// autofocus, Enter là gửi, kết quả to rõ, và tự dọn ô để quét vé tiếp theo.
// Máy quét mã vạch cầm tay hoạt động như bàn phím + Enter, nên form này chạy
// được với máy quét mà không cần thêm gì.

import { useEffect, useRef, useState } from 'react';
import { checkInTicket, getTicketByCode } from '../api/ticketApi';
import type { TicketDetail } from '../api/ticketApi';
import { useTheme } from '../context/useTheme';

type Result =
  | { kind: 'ok'; code: string; at: string }
  | { kind: 'error'; message: string }
  | null;

export default function StaffCheckinPage() {
  const { darkMode } = useTheme();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [preview, setPreview] = useState<TicketDetail | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Luôn trả focus về ô nhập — nhân viên quét liên tục, không nên phải click.
  useEffect(() => { inputRef.current?.focus(); }, [result]);

  const submit = async () => {
    const value = code.trim();
    if (!value || busy) return;

    setBusy(true);
    setPreview(null);
    try {
      const res = await checkInTicket(value);
      setResult({ kind: 'ok', code: res.ticketCode, at: res.checkedInAt });
      setCode('');
    } catch (err) {
      const message = (err as Error).message;
      setResult({ kind: 'error', message });

      // Khi từ chối, cố tra thêm thông tin vé để nhân viên biết vé đó là gì
      // (đã dùng lúc nào, trạng thái ra sao) thay vì chỉ thấy một dòng lỗi.
      try {
        setPreview(await getTicketByCode(value));
      } catch {
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
            Quét mã vạch trên vé hoặc nhập tay mã vé, rồi nhấn Enter.
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
              placeholder="VD: TK-2024-000123"
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
                {/* checked_in_by trước đây LUÔN null vì backend đọc nhầm
                    req.user.user_id (payload thật là userId). Đã sửa ở
                    ticket.controller.ts — vé soát từ nay có truy vết nhân viên. */}
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
