
import axiosClient from './axiosClient';

export interface TicketDetail {
  ticketId: string;
  ticketCode: string;
  qrCode: string;
  /* VALID | USED | CANCELLED | EXPIRED */
  ticketStatus: string;
  issuedAt: string;
  checkedInAt: string | null;
  checkedInBy: number | null;
}

export interface CheckInResult {
  message: string;
  ticketCode: string;
  checkedInAt: string;
  ticketCount?: number;
  ticketCodes?: string[];
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

export async function getTicketByCode(code: string): Promise<TicketDetail> {
  try {
    return (await axiosClient.get(
      `/tickets/${encodeURIComponent(code.trim())}`,
    )) as unknown as TicketDetail;
  } catch (err) {
    throw new Error(readErrorMessage(err, 'Không tìm thấy vé'), { cause: err });
  }
}

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
