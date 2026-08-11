import { beforeEach, describe, expect, it, vi } from 'vitest';

const axiosMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../src/api/axiosClient', () => ({
  default: {
    get: axiosMocks.get,
    post: axiosMocks.post,
    delete: axiosMocks.delete,
  },
}));

import {
  cancelBooking,
  getMyBookings,
} from '../src/api/bookingApi';
import {
  getOrder,
  getPaymentMethods,
  payOrder,
} from '../src/api/paymentApi';
import { getPaymentErrorMessage } from '../src/hooks/usePayment';

describe('Booking/payment', () => {
  beforeEach(() => {
    axiosMocks.get.mockReset();
    axiosMocks.post.mockReset();
    axiosMocks.delete.mockReset();
  });

  it('tải và chuẩn hóa lịch sử booking', async () => {
    axiosMocks.get.mockResolvedValue({
      data: [
        {
          booking_id: 7,
          booking_code: 'BK-0007',
          movieTitle: 'Dune: Part Two',
          total_amount: '180000',
          status: 'PENDING_PAYMENT',
        },
      ],
      total: 1,
    });

    const result = await getMyBookings({
      page: 1,
      limit: 10,
    });

    expect(axiosMocks.get).toHaveBeenCalledWith('/bookings/my', {
      params: {
        page: 1,
        limit: 10,
      },
    });
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: '7',
      orderCode: 'BK-0007',
      movieTitle: 'Dune: Part Two',
      totalAmount: 180000,
      status: 'PENDING_PAYMENT',
    });
  });

  it('truyền đúng thông báo khi tải lịch sử booking thất bại', async () => {
    axiosMocks.get.mockRejectedValue({
      message: 'Không kết nối được máy chủ',
    });

    await expect(
      getMyBookings({
        page: 1,
        limit: 10,
      }),
    ).rejects.toThrow('Không kết nối được máy chủ');
  });

  it('không gọi API hủy booking khi thiếu bookingId', async () => {
    await expect(cancelBooking('')).rejects.toThrow('Thiếu mã booking');
    expect(axiosMocks.delete).not.toHaveBeenCalled();
  });

  it('từ chối dữ liệu đơn hàng có bookingId không phải số', async () => {
    axiosMocks.get.mockResolvedValue({
      bookingId: 'BK-ABC',
      movieTitle: 'Phim lỗi',
      totalAmount: 100000,
      status: 'PENDING_PAYMENT',
    });

    await expect(getOrder('12')).rejects.toThrow(
      'Dữ liệu đơn hàng không hợp lệ',
    );
  });

  it('trả danh sách phương thức dự phòng khi API lỗi', async () => {
    axiosMocks.get.mockRejectedValue(new Error('Backend offline'));

    const methods = await getPaymentMethods();

    expect(methods.map((item) => item.code)).toEqual([
      'MOMO',
      'VNPAY',
      'BANKING',
      'MOCK',
      'CASH',
    ]);
    expect(methods.find((item) => item.code === 'CASH')?.enabled).toBe(true);
    expect(methods.find((item) => item.code === 'MOCK')?.enabled).toBe(false);
  });

  it('thanh toán CASH tạo payment ở trạng thái chờ và không tự xác nhận', async () => {
    axiosMocks.post.mockResolvedValue({
      paymentId: 99,
      transactionCode: 'TX-99',
      redirectUrl: '/pay/99',
    });

    const result = await payOrder('12', 'CASH');

    expect(axiosMocks.post).toHaveBeenCalledTimes(1);
    expect(axiosMocks.post).toHaveBeenCalledWith('/payments', {
      bookingId: '12',
      paymentMethod: 'CASH',
    });
    expect(result).toEqual({
      success: true,
      status: 'PENDING',
      paymentId: '99',
      transactionCode: 'TX-99',
      redirectUrl: '/pay/99',
    });
  });

  it('thanh toán MOCK tạo payment rồi xác nhận thành công', async () => {
    axiosMocks.post
      .mockResolvedValueOnce({
        paymentId: 100,
        transaction_code: 'TX-100',
      })
      .mockResolvedValueOnce({
        success: true,
      });

    const result = await payOrder('13', 'MOCK');

    expect(axiosMocks.post).toHaveBeenNthCalledWith(1, '/payments', {
      bookingId: '13',
      paymentMethod: 'MOCK',
    });
    expect(axiosMocks.post).toHaveBeenNthCalledWith(
      2,
      '/payments/100/success',
    );
    expect(result).toEqual({
      success: true,
      status: 'SUCCESS',
      paymentId: '100',
      transactionCode: 'TX-100',
      redirectUrl: undefined,
    });
  });
});

describe('Payment error helpers', () => {
  it('giữ nguyên lỗi plain-object từ axiosClient', () => {
    expect(
      getPaymentErrorMessage({
        status: 500,
        message: 'SQL Server connection lost',
      }),
    ).toBe('SQL Server connection lost');
  });

  it('đọc được mảng message từ backend validation', () => {
    expect(
      getPaymentErrorMessage({
        raw: {
          response: {
            data: {
              message: ['Booking đã hết hạn', 'Vui lòng đặt lại'],
            },
          },
        },
      }),
    ).toBe('Booking đã hết hạn, Vui lòng đặt lại');
  });
});
