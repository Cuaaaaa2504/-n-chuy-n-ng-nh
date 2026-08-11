import { beforeEach, describe, expect, it, vi } from 'vitest';

const axiosMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('../src/api/axiosClient', () => ({
  default: {
    get: axiosMocks.get,
    post: axiosMocks.post,
  },
}));

import { getBookingTickets } from '../src/api/bookingApi';
import {
  checkInTicket,
  getTicketByCode,
} from '../src/api/ticketApi';

describe('Vé và lịch sử', () => {
  beforeEach(() => {
    axiosMocks.get.mockReset();
    axiosMocks.post.mockReset();
  });

  it('không tải vé khi thiếu bookingId', async () => {
    await expect(getBookingTickets('')).rejects.toThrow('Thiếu mã booking');
    expect(axiosMocks.get).not.toHaveBeenCalled();
  });

  it('chuẩn hóa danh sách vé nằm trong data.tickets', async () => {
    axiosMocks.get.mockResolvedValue({
      data: {
        tickets: [
          {
            ticketId: 9,
            code: 'TICKET-0009',
            bookingCode: 'BK-0009',
            movie: {
              title: 'Dune: Part Two',
            },
            seatLabel: 'A1',
            ticketStatus: 'VALID',
          },
        ],
      },
    });

    const tickets = await getBookingTickets('9');

    expect(axiosMocks.get).toHaveBeenCalledWith('/bookings/9/tickets');
    expect(tickets).toHaveLength(1);
    expect(tickets[0]).toMatchObject({
      ticketId: 9,
      ticketCode: 'TICKET-0009',
      orderCode: 'BK-0009',
      movieTitle: 'Dune: Part Two',
      seatCode: 'A1',
      seatName: 'A1',
      qrCode: 'TICKET-0009',
      status: 'VALID',
    });
  });

  it('cắt khoảng trắng và mã hóa mã vé trước khi gọi API', async () => {
    const ticket = {
      ticketId: '10',
      ticketCode: 'A/B',
      qrCode: 'A/B',
      ticketStatus: 'VALID',
      issuedAt: '2026-08-07T10:00:00.000Z',
      checkedInAt: null,
      checkedInBy: null,
    };
    axiosMocks.get.mockResolvedValue(ticket);

    await expect(getTicketByCode('  A/B  ')).resolves.toEqual(ticket);
    expect(axiosMocks.get).toHaveBeenCalledWith('/tickets/A%2FB');
  });

  it('ghép mảng thông báo lỗi khi vé đã được check-in', async () => {
    axiosMocks.post.mockRejectedValue({
      raw: {
        response: {
          data: {
            message: [
              'Vé đã được sử dụng',
              'Không thể check-in lần hai',
            ],
          },
        },
      },
    });

    await expect(checkInTicket('TICKET-0010')).rejects.toThrow(
      'Vé đã được sử dụng, Không thể check-in lần hai',
    );
  });
});
