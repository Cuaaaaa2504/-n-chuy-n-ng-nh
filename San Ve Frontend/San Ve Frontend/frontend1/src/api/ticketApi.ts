// src/api/ticketApi.ts
//
// FIX [mục 7.1 + 7.2 của báo cáo] — file này TRƯỚC ĐÂY KHÔNG TỒN TẠI.
//
// Ghi chú đính chính báo cáo: mục 7.1 nói `TicketDetailPage.tsx` "chỉ là
// skeleton, không gọi GET /tickets/:code". Kiểm tra lại thì trang đó ĐÃ gọi
// đúng endpoint (qua axiosClient trực tiếp). Lỗi thật nằm ở chỗ khác — xem
// comment trong `MyTicketsPage.tsx`: nút "Xem vé" trỏ tới `/ticket/:id` (số ít)
// trong khi route đăng ký là `/tickets/:ticketId` (số nhiều), và tham số truyền
// vào là bookingId chứ không phải mã vé. Bấm vào là 404.
//
// Mục 7.2 thì đúng hoàn toàn: `POST /tickets/:code/checkin` không có UI nào.

import axiosClient from './axiosClient';

export interface TicketDetail {
  ticketId: string;
  ticketCode: string;
  qrCode: string;
  /** VALID | USED | CANCELLED | EXPIRED */
  ticketStatus: string;
  issuedAt: string;
  checkedInAt: string | null;
  checkedInBy: number | null;
}

export interface CheckInResult {
  message: string;
  ticketCode: string;
  checkedInAt: string;
}

function readErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    message?: string;
    response?: { data?: { message?: string | string[] } };
    raw?: { response?: { data?: { message?: string | string[] } } };
  };
  const raw =
    e?.response?.data?.message ??
    e?.raw?.response?.data?.message ??
    e?.message;
  if (Array.isArray(raw)) return raw.join(', ');
  return raw ?? fallback;
}

/** GET /tickets/:code */
export async function getTicketByCode(code: string): Promise<TicketDetail> {
  try {
    return (await axiosClient.get(
      `/tickets/${encodeURIComponent(code.trim())}`,
    )) as unknown as TicketDetail;
  } catch (err) {
    throw new Error(readErrorMessage(err, 'Không tìm thấy vé'), { cause: err });
  }
}

/**
 * POST /tickets/:code/checkin — chỉ STAFF/ADMIN.
 *
 * Backend phân biệt rõ 3 trường hợp từ chối (đã check-in / đã huỷ / hết hạn)
 * bằng BadRequestException kèm message tiếng Việt, nên cứ ném nguyên message
 * lên UI là nhân viên tại quầy hiểu ngay phải làm gì.
 */
export async function checkInTicket(code: string): Promise<CheckInResult> {
  try {
    return (await axiosClient.post(
      `/tickets/${encodeURIComponent(code.trim())}/checkin`,
    )) as unknown as CheckInResult;
  } catch (err) {
    throw new Error(readErrorMessage(err, 'Check-in thất bại'), { cause: err });
  }
}

export default { getTicketByCode, checkInTicket };
