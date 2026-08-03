import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingService } from '../booking/booking.service';
import type {
  BookingProductItemDto,
  CreateBookingRequest,
} from '../booking/dto/create-booking.request';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import {
  BOOKING_REF_PATTERN,
  PAYMENT_METHODS,
  type PaymentMethodCode,
} from '../payment/dto/create-payment.dto';
import { PaymentService } from '../payment/payment.service';
import { SeatHoldService } from '../showtime-seats/seat-hold/seat-hold.service';
import { ShowtimeSeatsService } from '../showtime-seats/showtime-seats.service';

const MAX_SEATS_PER_BOOKING = 8;
const DEFAULT_HOLD_MINUTES = 10;
const MAX_HOLD_MINUTES = 10;
const MAX_PRODUCTS = 20;

type ToolArgs = Record<string, unknown>;

function requirePositiveUserId(userId: number): void {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new BadRequestException(
      'Không xác định được người dùng đang đăng nhập',
    );
  }
}

function optionalText(
  value: unknown,
  field: string,
  maxLength: number,
): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} phải là chuỗi`);
  }

  const text = value.trim();
  if (!text) return undefined;
  if (text.length > maxLength) {
    throw new BadRequestException(
      `${field} không được dài quá ${maxLength} ký tự`,
    );
  }
  return text;
}

function positiveInteger(value: unknown, field: string): number {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new BadRequestException(`${field} phải là số nguyên dương`);
  }
  return numberValue;
}

function normalizeSeatLabel(value: unknown): string {
  const label = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');

  if (!/^[A-Z]{1,3}\d{1,3}$/.test(label)) {
    throw new BadRequestException(
      `Mã ghế "${String(value ?? '')}" không hợp lệ`,
    );
  }

  return label;
}

function seatLabelArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new BadRequestException('seatLabels phải là mảng không rỗng');
  }

  const labels = [...new Set(value.map(normalizeSeatLabel))];

  if (labels.length !== value.length) {
    throw new BadRequestException(
      'seatLabels không được chứa mã ghế trùng nhau',
    );
  }

  if (labels.length > MAX_SEATS_PER_BOOKING) {
    throw new BadRequestException(
      `Mỗi đơn chỉ được đặt tối đa ${MAX_SEATS_PER_BOOKING} ghế`,
    );
  }

  return labels;
}

function holdIdArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new BadRequestException('holdIds phải là mảng không rỗng');
  }

  const holdIds = [
    ...new Set(
      value
        .map((item) => String(item ?? '').trim())
        .filter((item) => /^\d+$/.test(item)),
    ),
  ];

  if (holdIds.length !== value.length) {
    throw new BadRequestException(
      'holdIds chỉ được chứa ID số hợp lệ và không trùng nhau',
    );
  }
  if (holdIds.length > MAX_SEATS_PER_BOOKING) {
    throw new BadRequestException(
      `Mỗi đơn chỉ được đặt tối đa ${MAX_SEATS_PER_BOOKING} ghế`,
    );
  }
  return holdIds;
}

function bookingProducts(value: unknown): BookingProductItemDto[] | undefined {
  if (value === null || value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new BadRequestException('products phải là một mảng');
  }
  if (value.length > MAX_PRODUCTS) {
    throw new BadRequestException(
      `products chỉ được chứa tối đa ${MAX_PRODUCTS} dòng`,
    );
  }

  return value.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new BadRequestException(`products[${index}] không hợp lệ`);
    }

    const record = item as ToolArgs;
    const productId = positiveInteger(
      record.productId,
      `products[${index}].productId`,
    );
    const quantity = positiveInteger(
      record.quantity,
      `products[${index}].quantity`,
    );

    if (quantity > 20) {
      throw new BadRequestException(
        `products[${index}].quantity không được vượt quá 20`,
      );
    }

    return { productId, quantity };
  });
}

@Injectable()
export class ChatActionService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ShowtimeSeat)
    private readonly showtimeSeatRepo: Repository<ShowtimeSeat>,
    private readonly showtimeSeatsService: ShowtimeSeatsService,
    private readonly seatHoldService: SeatHoldService,
    private readonly bookingService: BookingService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Nhận showtimeId + mã ghế thay vì để model đoán showtimeSeatId.
   * Mã ghế như D3 lặp lại ở mọi suất chiếu; nếu truy vấn chỉ theo label thì rất
   * dễ lấy nhầm ID của suất khác và BookingService phải chặn ở bước cuối.
   */
  async holdSeats(
    userId: number,
    args: ToolArgs,
  ): Promise<Record<string, unknown>> {
    requirePositiveUserId(userId);

    const showtimeId = positiveInteger(args.showtimeId, 'showtimeId');
    const seatLabels = seatLabelArray(args.seatLabels);

    const holdMinutes =
      args.holdMinutes === undefined
        ? DEFAULT_HOLD_MINUTES
        : positiveInteger(args.holdMinutes, 'holdMinutes');

    if (holdMinutes > MAX_HOLD_MINUTES) {
      throw new BadRequestException(
        `holdMinutes không được vượt quá ${MAX_HOLD_MINUTES} phút`,
      );
    }

    const showtimeSeats = await this.showtimeSeatRepo.find({
      where: { showtimeId },
      relations: ['seat'],
    });

    if (showtimeSeats.length === 0) {
      throw new BadRequestException(
        `Suất chiếu #${showtimeId} không tồn tại hoặc chưa được sinh ghế`,
      );
    }

    const seatsByLabel = new Map<string, ShowtimeSeat>();
    for (const item of showtimeSeats) {
      const label = normalizeSeatLabel(
        item.seat?.seatLabel ??
          `${item.seat?.seatRow ?? ''}${item.seat?.seatNumber ?? ''}`,
      );
      seatsByLabel.set(label, item);
    }

    const missingLabels = seatLabels.filter(
      (label) => !seatsByLabel.has(label),
    );
    if (missingLabels.length > 0) {
      throw new BadRequestException(
        `Không tìm thấy ghế ${missingLabels.join(', ')} trong suất chiếu #${showtimeId}`,
      );
    }

    const selectedSeats = seatLabels.map((label) => seatsByLabel.get(label)!);
    const now = new Date();

    const reusableSeats = selectedSeats.filter(
      (seat) =>
        seat.status === 'HELD' &&
        seat.heldByUserId === userId &&
        Boolean(seat.holdExpiresAt) &&
        new Date(seat.holdExpiresAt as Date).getTime() > now.getTime(),
    );

    const unavailableLabels = selectedSeats
      .filter((seat) => {
        if (seat.status === 'AVAILABLE') return false;
        return !reusableSeats.some(
          (reusable) =>
            reusable.showtimeSeatId === seat.showtimeSeatId,
        );
      })
      .map((seat) =>
        normalizeSeatLabel(
          seat.seat?.seatLabel ??
            `${seat.seat?.seatRow ?? ''}${seat.seat?.seatNumber ?? ''}`,
        ),
      );

    if (unavailableLabels.length > 0) {
      throw new BadRequestException(
        `Các ghế không còn trống: ${unavailableLabels.join(', ')}`,
      );
    }

    // Nếu lượt chat trước đã giữ ghế của chính user nhưng AI bị 429/timeout,
    // dùng lại hold đó thay vì báo "ghế không còn trống".
    const reusableHolds =
      await this.seatHoldService.getActiveHoldsForSeats(
        userId,
        reusableSeats.map((seat) => seat.showtimeSeatId),
      );

    if (reusableHolds.length !== reusableSeats.length) {
      const foundSeatIds = new Set(
        reusableHolds.map((hold) => hold.showtimeSeatId),
      );
      const inconsistentLabels = reusableSeats
        .filter((seat) => !foundSeatIds.has(seat.showtimeSeatId))
        .map((seat) =>
          normalizeSeatLabel(
            seat.seat?.seatLabel ??
              `${seat.seat?.seatRow ?? ''}${seat.seat?.seatNumber ?? ''}`,
          ),
        );

      throw new BadRequestException(
        `Trạng thái giữ ghế chưa đồng bộ: ${inconsistentLabels.join(', ')}. ` +
          'Vui lòng đợi hết hạn giữ ghế hoặc tải lại sơ đồ.',
      );
    }

    const availableSeats = selectedSeats.filter(
      (seat) => seat.status === 'AVAILABLE',
    );

    const newHolds = availableSeats.length
      ? await this.showtimeSeatsService.holdManySeats(userId, {
          showtimeSeatIds: availableSeats.map(
            (seat) => seat.showtimeSeatId,
          ),
          holdMinutes,
        })
      : [];

    const reusableResponses = reusableHolds.map((hold) => {
      const seat = selectedSeats.find(
        (item) => item.showtimeSeatId === hold.showtimeSeatId,
      )!;

      return {
        holdId: hold.holdId,
        expiresAt: hold.expiresAt,
        showtimeSeatId: hold.showtimeSeatId,
        seatLabel: normalizeSeatLabel(
          seat.seat?.seatLabel ??
            `${seat.seat?.seatRow ?? ''}${seat.seat?.seatNumber ?? ''}`,
        ),
        price: Number(seat.price),
      };
    });

    const holds = [...reusableResponses, ...newHolds];

    return {
      success: true,
      showtimeId,
      holdIds: holds.map((hold) => String(hold.holdId)),
      expiresAt: holds
        .map((hold) => new Date(hold.expiresAt))
        .sort((a, b) => a.getTime() - b.getTime())[0] ?? null,
      seats: holds.map((hold) => ({
        holdId: String(hold.holdId),
        showtimeSeatId: hold.showtimeSeatId,
        seatLabel: hold.seatLabel,
        price: hold.price,
        expiresAt: hold.expiresAt,
      })),
      reusedExistingHolds: reusableResponses.length,
      nextAction: 'Tạo booking ngay từ holdIds vừa nhận.',
    };
  }

  /**
   * Giữ ghế và tạo booking trong cùng một lượt backend.
   *
   * Trước đây chatbot giữ ghế xong phải gọi Gemini thêm một vòng để model
   * gọi create_booking. Nếu vòng AI đó timeout/429, ghế bị HELD nhưng không có
   * booking PENDING_PAYMENT, nên mục "Vé đang giữ" trống.
   *
   * Nay không còn khoảng hở đó: hold thành công thì tạo booking ngay; nếu tạo
   * booking lỗi, createBooking() bên dưới tự giải phóng toàn bộ hold vừa tạo.
   */
  async holdSeatsAndCreateBooking(
    userId: number,
    args: ToolArgs,
  ): Promise<Record<string, unknown>> {
    const holdResult = await this.holdSeats(userId, args);
    const rawHoldIds = holdResult.holdIds;

    const holdIds = Array.isArray(rawHoldIds)
      ? rawHoldIds
          .map((id) => String(id ?? '').trim())
          .filter((id) => /^\d+$/.test(id))
      : [];

    if (!holdIds.length) {
      throw new BadRequestException(
        'Không lấy được holdIds sau khi giữ ghế',
      );
    }

    const bookingResult = await this.createBooking(userId, { holdIds });

    return {
      ...holdResult,
      booking: bookingResult.booking,
      nextAction:
        'Hỏi người dùng chọn MOMO, VNPAY, BANKING, CASH hoặc MOCK trước khi tạo thanh toán.',
    };
  }

  async createBooking(
    userId: number,
    args: ToolArgs,
  ): Promise<Record<string, unknown>> {
    requirePositiveUserId(userId);

    const holdIds = holdIdArray(args.holdIds);
    const request: CreateBookingRequest = {
      holdIds,
      voucherCode: optionalText(args.voucherCode, 'voucherCode', 50),
      idempotencyKey: optionalText(
        args.idempotencyKey,
        'idempotencyKey',
        100,
      ),
      products: bookingProducts(args.products),
    };

    if (args.promotionId !== undefined && args.promotionId !== null) {
      request.promotionId = positiveInteger(
        args.promotionId,
        'promotionId',
      );
    }

    try {
      const booking = await this.bookingService.createBooking(userId, request);

      return {
        success: true,
        booking,
        nextAction:
          'Hỏi người dùng chọn MOMO, VNPAY, BANKING, CASH hoặc MOCK trước khi gọi create_payment.',
      };
    } catch (error) {
      await Promise.allSettled(
        holdIds.map((holdId) =>
          this.seatHoldService.releaseHold(holdId, userId),
        ),
      );
      throw error;
    }
  }

  async createPayment(
    userId: number,
    args: ToolArgs,
  ): Promise<Record<string, unknown>> {
    requirePositiveUserId(userId);

    const bookingId = String(args.bookingId ?? '').trim();
    if (!BOOKING_REF_PATTERN.test(bookingId)) {
      throw new BadRequestException(
        'bookingId phải là ID số hoặc mã đơn dạng BK-xxxxx',
      );
    }

    const paymentMethod = String(args.paymentMethod ?? '')
      .trim()
      .toUpperCase() as PaymentMethodCode;

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      throw new BadRequestException(
        `paymentMethod phải là một trong: ${PAYMENT_METHODS.join(', ')}`,
      );
    }

    const payment = await this.paymentService.createPayment(userId, {
      bookingId,
      paymentMethod,
      provider: optionalText(args.provider, 'provider', 50),
    });

    const paymentPath = `/payment/${encodeURIComponent(
      String(payment.bookingId),
    )}`;

    const configuredBase =
      this.configService.get<string>('FRONTEND_URL')?.trim() ||
      this.configService.get<string>('CLIENT_URL')?.trim() ||
      '';

    const paymentUrl = configuredBase
      ? `${configuredBase.replace(/\/$/, '')}${paymentPath}`
      : paymentPath;

    return {
      success: true,
      payment,
      paymentUrl,
      note:
        'create_payment chỉ khởi tạo giao dịch. Người dùng vẫn phải tự hoàn tất thanh toán trên giao diện CineHunt.',
    };
  }
}
