import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

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

import {
  normalizeSeat,
  seatService,
} from '../src/api/seat.service';

describe('normalizeSeat', () => {
  it('chuẩn hóa dữ liệu ghế theo định dạng hiện tại', () => {
    const result = normalizeSeat({
      id: 101,
      rowName: 'A',
      seatNumber: 1,
      status: 'AVAILABLE',
      type: 'STANDARD',
      price: 90000,
    });

    expect(result).toEqual({
      id: 101,
      rowName: 'A',
      seatNumber: 1,
      status: 'AVAILABLE',
      type: 'STANDARD',
      price: 90000,
    });
  });

  it('chuẩn hóa dữ liệu theo tên trường backend', () => {
    const result = normalizeSeat({
      showtimeSeatId: 202,
      seatRow: 'B',
      seatNumber: '5',
      seatStatus: 'HELD',
      seatTypeCode: 'VIP',
      price: '120000',
    });

    expect(result).toEqual({
      id: 202,
      rowName: 'B',
      seatNumber: 5,
      status: 'HELD',
      type: 'VIP',
      price: 120000,
    });
  });

  it('dùng giá trị mặc định khi dữ liệu bị thiếu', () => {
    const result = normalizeSeat({});

    expect(result).toEqual({
      id: undefined,
      rowName: '',
      seatNumber: 0,
      status: 'AVAILABLE',
      type: undefined,
      price: undefined,
    });
  });
});

describe('seatService.getSeatsByShowtime', () => {
  beforeEach(() => {
    axiosMocks.get.mockReset();
    axiosMocks.post.mockReset();
  });

  it('gọi đúng API và chuẩn hóa danh sách ghế', async () => {
    axiosMocks.get.mockResolvedValue({
      seats: [
        {
          showtimeSeatId: 301,
          seatRow: 'C',
          seatNumber: '3',
          seatStatus: 'SOLD',
          seatTypeCode: 'VIP',
          price: '130000',
        },
      ],
    });

    const result = await seatService.getSeatsByShowtime(12);

    expect(axiosMocks.get).toHaveBeenCalledTimes(1);
    expect(axiosMocks.get).toHaveBeenCalledWith(
      '/showtime-seats/12',
    );

    expect(result).toEqual([
      {
        id: 301,
        rowName: 'C',
        seatNumber: 3,
        status: 'SOLD',
        type: 'VIP',
        price: 130000,
      },
    ]);
  });
});

describe('seatService.getSeatMap', () => {
  beforeEach(() => {
    axiosMocks.get.mockReset();
    axiosMocks.post.mockReset();
  });

  it('tự tính tổng số ghế khi backend không trả totalSeats', async () => {
    axiosMocks.get.mockResolvedValue({
      showtimeId: 15,
      movieTitle: 'Dune: Part Two',
      cinemaName: 'CMC Cinema',
      roomName: 'Phòng 01',
      startTime: '2026-08-07T12:00:00.000Z',
      endTime: '2026-08-07T14:00:00.000Z',
      seats: [
        {
          id: 401,
          rowName: 'D',
          seatNumber: 4,
          status: 'AVAILABLE',
          type: 'STANDARD',
          price: 90000,
        },
      ],
    });

    const result = await seatService.getSeatMap(15);

    expect(axiosMocks.get).toHaveBeenCalledWith(
      '/showtime-seats/15',
    );

    expect(result.totalSeats).toBe(1);
    expect(result.seatsGenerated).toBe(true);
    expect(result.seats).toHaveLength(1);
    expect(result.seats[0].price).toBe(90000);
  });

  it('trả trạng thái chưa sinh ghế khi danh sách rỗng', async () => {
    axiosMocks.get.mockResolvedValue({
      showtimeId: 16,
      movieTitle: 'Phim kiểm thử',
      cinemaName: 'CMC Cinema',
      roomName: 'Phòng 02',
      startTime: null,
      endTime: null,
      seats: [],
    });

    const result = await seatService.getSeatMap(16);

    expect(result.totalSeats).toBe(0);
    expect(result.seatsGenerated).toBe(false);
    expect(result.seats).toEqual([]);
  });
});

describe('seatService.holdSeats', () => {
  beforeEach(() => {
    axiosMocks.get.mockReset();
    axiosMocks.post.mockReset();
  });

  it('gửi danh sách ghế khi không truyền thời gian giữ', async () => {
    const response = [
      {
        holdId: '501',
        holdToken: 'token-501',
        expiresAt: '2026-08-07T12:10:00.000Z',
        status: 'ACTIVE',
        showtimeSeatId: 101,
        seatLabel: 'A1',
        price: 90000,
      },
    ];

    axiosMocks.post.mockResolvedValue(response);

    const result = await seatService.holdSeats([101, 102]);

    expect(axiosMocks.post).toHaveBeenCalledWith(
      '/showtime-seats/hold-many',
      {
        showtimeSeatIds: [101, 102],
      },
    );

    expect(result).toEqual(response);
  });

  it('gửi đúng thời gian giữ ghế', async () => {
    axiosMocks.post.mockResolvedValue([]);

    await seatService.holdSeats([201], 10);

    expect(axiosMocks.post).toHaveBeenCalledWith(
      '/showtime-seats/hold-many',
      {
        showtimeSeatIds: [201],
        holdMinutes: 10,
      },
    );
  });

  it('trả mảng rỗng khi backend trả sai định dạng', async () => {
    axiosMocks.post.mockResolvedValue({
      message: 'Dữ liệu không hợp lệ',
    });

    const result = await seatService.holdSeats([301]);

    expect(result).toEqual([]);
  });
});

describe('seatService.bookSeats', () => {
  beforeEach(() => {
    axiosMocks.get.mockReset();
    axiosMocks.post.mockReset();
  });

  it('tạo booking chỉ với danh sách holdIds', async () => {
    axiosMocks.post.mockResolvedValue({
      bookingId: 601,
      bookingCode: 'CMC-601',
      status: 'PENDING_PAYMENT',
    });

    const result = await seatService.bookSeats(['501', '502']);

    expect(axiosMocks.post).toHaveBeenCalledWith(
      '/bookings',
      {
        holdIds: ['501', '502'],
      },
    );

    expect(result).toEqual({
      bookingId: 601,
      bookingCode: 'CMC-601',
      status: 'PENDING_PAYMENT',
    });
  });

  it('gửi voucher, khuyến mãi và idempotency key', async () => {
    axiosMocks.post.mockResolvedValue({
      bookingId: 602,
      bookingCode: 'CMC-602',
      discountAmount: 20000,
      totalAmount: 160000,
    });

    await seatService.bookSeats(
      ['503', '504'],
      {
        voucherCode: 'CMC20',
        promotionId: 12,
        idempotencyKey: 'booking-test-602',
      },
    );

    expect(axiosMocks.post).toHaveBeenCalledWith(
      '/bookings',
      {
        holdIds: ['503', '504'],
        voucherCode: 'CMC20',
        promotionId: 12,
        idempotencyKey: 'booking-test-602',
      },
    );
  });
});
