
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import type { Readable } from 'stream';
import { ChatActionService } from './chat-action.service';
import { ChatDataService } from './chat-data.service';
import {
  CHAT_FUNCTION_DECLARATIONS,
  CHAT_TOOL_NAMES,
} from './chat-tools';
import { runGroqFallback } from './groq-fallback';
import { ChatMessageDto } from './dto/chat-message.dto';

const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';
const KNOWN_SHUTDOWN_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
];
const GEMINI_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_TOOL_ROUNDS = 4;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RATE_LIMIT_RETRIES = 0;
const RETRY_BASE_DELAY_MS = 1_200;

type GeminiPart = {
  text?: string;
  functionCall?: {
    name: string;
    args?: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
  };
};

type GeminiContent = {
  role: 'user' | 'model';
  parts: GeminiPart[];
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
      role?: string;
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
};

export type ChatErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_REQUEST'
  | 'INVALID_API_KEY'
  | 'MODEL_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'TIMEOUT'
  | 'EMPTY_RESPONSE'
  | 'BLOCKED';

export interface ChatStreamEvent {
  type: 'delta' | 'tool' | 'done' | 'error';
  text?: string;
  tool?: string;
  code?: ChatErrorCode;
  message?: string;
}

const SYSTEM_PROMPT = `
Bạn là trợ lý AI của CineHunt, nền tảng đặt vé xem phim trực tuyến.

CÔNG CỤ DỮ LIỆU THẬT:
- Đọc dữ liệu: search_movies, get_movie_detail, get_showtimes,
  check_seat_availability, list_combos, list_cinemas.
- Thao tác đặt vé: hold_seats (giữ ghế và tạo booking trong cùng lượt),
  create_payment.

QUY TẮC DỮ LIỆU:
- Mọi câu hỏi về phim đang chiếu, lịch chiếu, giá vé, tình trạng ghế, combo
  hoặc địa chỉ rạp PHẢI gọi công cụ tương ứng trước khi trả lời.
- Dữ liệu CineHunt là nguồn duy nhất đúng. Không bịa tên phim, giờ chiếu,
  giá vé, ID, mã ghế, holdId, bookingId hay trạng thái thanh toán.
- Muốn kiểm tra ghế phải có showtimeId. Nếu chưa có, gọi get_showtimes trước.
- Giá tiền do công cụ trả về đã là VNĐ, giữ nguyên và không tự quy đổi.

QUY TRÌNH ĐẶT VÉ QUA CHAT, PHẢI ĐÚNG THỨ TỰ:
1. Xác định phim và gọi search_movies hoặc get_movie_detail.
2. Gọi get_showtimes để người dùng chọn đúng rạp, ngày và giờ.
3. Gọi check_seat_availability để kiểm tra ghế.
4. Tóm tắt rõ: tên phim, rạp, phòng, giờ chiếu, MÃ SUẤT CHIẾU (showtimeId),
   mã ghế, số lượng và giá. Dòng mã suất chiếu không được bỏ vì tin nhắn sau
   cần dùng lại đúng suất. Hỏi người dùng XÁC NHẬN rồi dừng và chờ tin nhắn mới.
5. Chỉ khi người dùng vừa xác nhận rõ ràng mới gọi hold_seats bằng đúng
   showtimeId và seatLabels từ bản tóm tắt. Không truyền showtimeSeatIds.
   Backend sẽ giữ ghế và tạo booking ngay trong cùng thao tác này.
6. Sau khi booking thành công, hỏi người dùng chọn một phương thức:
   MOMO, VNPAY, BANKING, CASH hoặc MOCK. Dừng lại và chờ câu trả lời mới.
7. Chỉ khi người dùng vừa chọn rõ phương thức mới gọi create_payment.
8. Trả paymentUrl cho người dùng. create_payment chỉ khởi tạo giao dịch;
   tuyệt đối không nói đã thanh toán thành công và không tự gọi endpoint success.

QUY TẮC AN TOÀN:
- Không gọi hold_seats trước bước xác nhận.
- Không đoán showtimeSeatId. Mã ghế như D3 có thể lặp ở nhiều suất; backend sẽ
  tự phân giải bằng showtimeId + seatLabels.
- Khi người dùng xác nhận, ưu tiên dùng lại showtimeId trong bản tóm tắt ngay
  trước đó; không gọi lại chuỗi tìm phim/lịch/ghế nếu thông tin vẫn đầy đủ.
- Không gọi create_booking riêng sau hold_seats; backend đã tạo booking
  trong cùng thao tác để không để lại ghế HELD mồ côi khi AI lỗi.
- Không gọi create_payment nếu chưa có booking thật và phương thức do user chọn.
- Không dùng ID từ cuộc hội thoại khác hoặc hành động thay người dùng khác.
- Nếu công cụ trả lỗi, nói đúng lỗi và hướng dẫn bước tiếp theo; không tự lặp
  thao tác ghi nhiều lần.
- Không truy cập hoặc suy đoán thông tin cá nhân, lịch sử đặt vé hay thanh toán
  của người khác.
- Trả lời ngắn gọn, thân thiện, bằng tiếng Việt.
- Nếu câu hỏi ngoài phạm vi phim ảnh và đặt vé, lịch sự từ chối.
`.trim();

@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly chatData: ChatDataService,
    private readonly chatActions: ChatActionService,
  ) {}

  onModuleInit(): void {
    const apiKey = this.apiKey;
    const model = this.model;

    if (!apiKey) {
      if (this.groqApiKey) {
        this.logger.warn(
          'Chưa có GEMINI_API_KEY -> chatbot sẽ dùng Groq làm nhà cung cấp chính.',
        );
      } else {
        this.logger.error(
          'Chưa có GEMINI_API_KEY hoặc GROQ_API_KEY -> chatbot sẽ không hoạt động.',
        );
      }
    } else {
      this.logger.log(`Chatbot Gemini sẵn sàng (model: ${model}).`);
    }

    if (this.groqApiKey) {
      this.logger.log(
        `Chatbot Groq fallback sẵn sàng (model: ${this.groqModel}).`,
      );
    } else {
      this.logger.warn(
        'Chưa có GROQ_API_KEY -> khi Gemini bị 429 chatbot sẽ chuyển sang chế độ đặt vé thủ công.',
      );
    }

    if (KNOWN_SHUTDOWN_MODELS.includes(model)) {
      this.logger.error(
        `GEMINI_MODEL="${model}" đã bị đánh dấu ngừng phục vụ. ` +
          `Hãy đổi GEMINI_MODEL trong .env.`,
      );
    }
  }

  private get apiKey(): string {
    return this.configService.get<string>('GEMINI_API_KEY')?.trim() ?? '';
  }

  private get model(): string {
    return (
      this.configService.get<string>('GEMINI_MODEL')?.trim() ||
      DEFAULT_GEMINI_MODEL
    );
  }

  private get groqApiKey(): string {
    return this.configService.get<string>('GROQ_API_KEY')?.trim() ?? '';
  }

  private get groqModel(): string {
    return (
      this.configService.get<string>('GROQ_MODEL')?.trim() ||
      'openai/gpt-oss-20b'
    );
  }

  private shouldFallbackToGroq(error: unknown): boolean {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      const code =
        response && typeof response === 'object'
          ? String((response as { code?: string }).code ?? '')
          : '';

      return new Set<string>([
        'MISSING_API_KEY',
        'INVALID_API_KEY',
        'MODEL_NOT_FOUND',
        'RATE_LIMITED',
        'UPSTREAM_ERROR',
        'TIMEOUT',
        'EMPTY_RESPONSE',
      ]).has(code);
    }

    const status = (error as AxiosError)?.response?.status;
    return (
      status === 401 ||
      status === 403 ||
      status === 404 ||
      status === 408 ||
      status === 429 ||
      (typeof status === 'number' && status >= 500)
    );
  }

  private allProvidersUnavailable(reason?: unknown): HttpException {
    const detail =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Không xác định';

    this.logger.error(
      `Cả Gemini và Groq đều không khả dụng: ${detail}`,
    );

    return new HttpException(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        code: 'UPSTREAM_ERROR' as ChatErrorCode,
        message:
          'Trợ lý AI đang tạm quá tải. Bạn vẫn có thể đặt vé trực tiếp tại mục Phim hoặc Lịch chiếu.',
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  private async replyWithGroq(
    messages: ChatMessageDto[],
    userId: number,
  ): Promise<string> {
    const apiKey = this.groqApiKey;

    if (!apiKey) {
      throw this.allProvidersUnavailable(
        'Backend chưa cấu hình GROQ_API_KEY.',
      );
    }

    try {
      return await runGroqFallback({
        apiKey,
        model: this.groqModel,
        systemPrompt: SYSTEM_PROMPT,
        messages,
        declarations: CHAT_FUNCTION_DECLARATIONS,
        executeTool: (name, args) =>
          this.executeTool(name, args, userId, messages),
        terminalToolReply: (results) =>
          this.terminalToolReply(results),
        log: (message) => this.logger.warn(message),
      });
    } catch (error) {
      throw this.allProvidersUnavailable(error);
    }
  }

  private buildContents(messages: ChatMessageDto[]): GeminiContent[] {
    const mapped: GeminiContent[] = (messages ?? [])
      .filter(
        (message) =>
          message &&
          typeof message.content === 'string' &&
          message.content.trim(),
      )
      .map((message) => ({
        role:
          message.role === 'assistant'
            ? ('model' as const)
            : ('user' as const),
        parts: [{ text: message.content.trim() }],
      }));

    let start = 0;
    while (start < mapped.length && mapped[start].role === 'model') {
      start += 1;
    }

    const merged: GeminiContent[] = [];
    for (const item of mapped.slice(start)) {
      const last = merged[merged.length - 1];

      if (last && last.role === item.role) {
        last.parts[0].text = `${last.parts[0].text}\n\n${item.parts[0].text}`;
      } else {
        merged.push({
          role: item.role,
          parts: [{ text: item.parts[0].text }],
        });
      }
    }

    if (merged.length === 0 || merged[merged.length - 1].role !== 'user') {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'INVALID_REQUEST' as ChatErrorCode,
          message: 'Tin nhắn cuối cùng phải là của người dùng.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return merged;
  }

  private requireApiKey(): string {
    const apiKey = this.apiKey;

    if (!apiKey) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'MISSING_API_KEY' as ChatErrorCode,
          message:
            'Backend chưa cấu hình GEMINI_API_KEY. Thêm biến này vào .env rồi khởi động lại server.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return apiKey;
  }

  private get requestBody() {
    return {
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      tools: [
        {
          functionDeclarations: CHAT_FUNCTION_DECLARATIONS,
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 768,
      },
    };
  }

  private latestUserMessage(messages: ChatMessageDto[]): string {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === 'user') {
        return messages[index].content.trim().toLowerCase();
      }
    }
    return '';
  }

  private previousAssistantMessage(messages: ChatMessageDto[]): string {
    let foundLatestUser = false;

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (!message) continue;

      if (!foundLatestUser && message.role === 'user') {
        foundLatestUser = true;
        continue;
      }

      if (foundLatestUser && message.role === 'assistant') {
        return message.content.trim().toLowerCase();
      }
    }

    return '';
  }

  private hasExplicitSeatConfirmation(messages: ChatMessageDto[]): boolean {
    const userText = this.latestUserMessage(messages);
    const assistantText = this.previousAssistantMessage(messages);

    const assistantAskedForConfirmation =
      assistantText.includes('xác nhận') &&
      assistantText.includes('ghế') &&
      (assistantText.includes('giá') ||
        assistantText.includes('tổng') ||
        assistantText.includes('suất'));

    const confirmationPhrases = [
      'đồng ý',
      'xác nhận',
      'chốt',
      'ok',
      'okay',
      'oke',
      'yes',
      'tiếp tục',
      'giữ ghế',
    ];

    const userConfirmed = confirmationPhrases.some(
      (phrase) =>
        userText === phrase ||
        userText.startsWith(`${phrase} `) ||
        userText.startsWith(`${phrase},`) ||
        userText.startsWith(`${phrase}.`) ||
        userText.startsWith(`${phrase}!`),
    );

    return assistantAskedForConfirmation && userConfirmed;
  }

  private confirmedSeatActionArgs(
    messages: ChatMessageDto[],
  ): Record<string, unknown> | null {
    if (!this.hasExplicitSeatConfirmation(messages)) return null;

    const summary = this.previousAssistantMessage(messages);

    const showtimeMatch =
      summary.match(/showtimeid\)?\s*[:#-]?\s*(\d+)/i) ??
      summary.match(/mã suất chiếu[^0-9]*(\d+)/i);

    const seatLine = summary.match(/mã ghế\s*:\s*([^\n\r]+)/i);
    const seatLabels = seatLine?.[1]?.match(/[a-z]{1,3}\d{1,3}/gi) ?? [];

    const showtimeId = Number(showtimeMatch?.[1]);

    if (
      !Number.isInteger(showtimeId) ||
      showtimeId <= 0 ||
      seatLabels.length === 0
    ) {
      return null;
    }

    return {
      showtimeId,
      seatLabels: [...new Set(seatLabels.map((label) => label.toUpperCase()))],
    };
  }

  private hasExplicitPaymentSelection(
    messages: ChatMessageDto[],
    args: Record<string, unknown>,
  ): boolean {
    const method = String(args.paymentMethod ?? '')
      .trim()
      .toUpperCase();
    const userText = this.latestUserMessage(messages);

    const aliases: Record<string, string[]> = {
      MOMO: ['momo', 'mo mo'],
      VNPAY: ['vnpay', 'vn pay'],
      BANKING: ['banking', 'chuyển khoản', 'ngân hàng', 'qr'],
      CASH: ['cash', 'tiền mặt', 'tại quầy'],
      MOCK: ['mock', 'giả lập', 'demo'],
    };

    return (aliases[method] ?? [method.toLowerCase()]).some((alias) =>
      userText.includes(alias),
    );
  }

  private toolErrorMessage(error: unknown): string {
    if (error instanceof HttpException) {
      const response = error.getResponse();

      if (typeof response === 'string') return response;

      const message = (response as { message?: string | string[] })?.message;
      if (Array.isArray(message)) return message.join('; ');
      if (typeof message === 'string') return message;
    }

    return 'Không thể thực hiện thao tác CineHunt lúc này.';
  }

  private async executeTool(
    name: string,
    args: Record<string, unknown>,
    userId: number,
    messages: ChatMessageDto[],
  ): Promise<Record<string, unknown>> {
    try {
      switch (name) {
        case CHAT_TOOL_NAMES.SEARCH_MOVIES:
          return (await this.chatData.searchMovies(args as any)) as any;

        case CHAT_TOOL_NAMES.GET_MOVIE_DETAIL:
          return (await this.chatData.getMovieDetail(args as any)) as any;

        case CHAT_TOOL_NAMES.GET_SHOWTIMES:
          return (await this.chatData.getShowtimes(args as any)) as any;

        case CHAT_TOOL_NAMES.CHECK_SEATS:
          return (await this.chatData.checkSeatAvailability(
            args as any,
          )) as any;

        case CHAT_TOOL_NAMES.LIST_COMBOS:
          return (await this.chatData.listCombos(args as any)) as any;

        case CHAT_TOOL_NAMES.LIST_CINEMAS:
          return (await this.chatData.listCinemas(args as any)) as any;

        case CHAT_TOOL_NAMES.HOLD_SEATS:
          if (!this.hasExplicitSeatConfirmation(messages)) {
            return {
              success: false,
              error:
                'Chưa có xác nhận hợp lệ. Hãy tóm tắt phim, suất chiếu, ghế và giá; hỏi xác nhận rồi chờ tin nhắn mới.',
              requiresConfirmation: true,
            };
          }
          return this.chatActions.holdSeatsAndCreateBooking(userId, args);

        case CHAT_TOOL_NAMES.CREATE_BOOKING:
          return this.chatActions.createBooking(userId, args);

        case CHAT_TOOL_NAMES.CREATE_PAYMENT:
          if (!this.hasExplicitPaymentSelection(messages, args)) {
            return {
              success: false,
              error:
                'Người dùng chưa chọn rõ phương thức thanh toán trong tin nhắn gần nhất.',
              requiresPaymentMethod: true,
            };
          }
          return this.chatActions.createPayment(userId, args);

        default:
          this.logger.warn(`Model gọi công cụ không tồn tại: ${name}`);
          return {
            success: false,
            error: `Không có công cụ tên "${name}".`,
          };
      }
    } catch (error) {
      const message = this.toolErrorMessage(error);

      this.logger.error(
        `Công cụ ${name} lỗi: ${(error as Error)?.message ?? message}`,
        (error as Error)?.stack,
      );

      return {
        success: false,
        error: message,
        hint:
          'Không tự lặp lại thao tác ghi. Hãy giải thích lỗi và hỏi người dùng bước tiếp theo.',
      };
    }
  }

  private extractParts(payload: GeminiResponse): GeminiPart[] {
    return payload?.candidates?.[0]?.content?.parts ?? [];
  }

  private partsToText(parts: GeminiPart[]): string {
    return parts
      .map((part) => part.text ?? '')
      .join('')
      .trim();
  }

  private buildFunctionResponseContent(
    results: Array<{
      name: string;
      response: Record<string, unknown>;
    }>,
  ): GeminiContent {
    return {
      role: 'user',
      parts: results.map((result) => ({
        functionResponse: {
          name: result.name,
          response: result.response,
        },
      })),
    };
  }

  private formatVnd(value: unknown): string {
    const amount = Number(value);
    return Number.isFinite(amount)
      ? `${amount.toLocaleString('vi-VN')} VNĐ`
      : 'chưa xác định';
  }

  private terminalToolReply(
    results: Array<{
      name: string;
      response: Record<string, unknown>;
    }>,
  ): string | null {
    const writeTools = new Set<string>([
      CHAT_TOOL_NAMES.HOLD_SEATS,
      CHAT_TOOL_NAMES.CREATE_BOOKING,
      CHAT_TOOL_NAMES.CREATE_PAYMENT,
    ]);

    const failure = results.find(
      (result) =>
        writeTools.has(result.name) && result.response.success === false,
    );

    if (failure) {
      const error = String(
        failure.response.error ??
          'Không thể thực hiện thao tác đặt vé lúc này.',
      );
      return `Không thể tiếp tục: ${error}`;
    }

    const paymentResult = results.find(
      (result) =>
        result.name === CHAT_TOOL_NAMES.CREATE_PAYMENT &&
        result.response.success === true,
    );

    if (paymentResult) {
      const payment =
        (paymentResult.response.payment as Record<string, unknown>) ?? {};
      const url = String(paymentResult.response.paymentUrl ?? '').trim();
      const paymentId = String(payment.paymentId ?? '').trim();

      return [
        'Đã khởi tạo giao dịch thanh toán.',
        paymentId ? `Mã giao dịch: ${paymentId}` : '',
        url ? `Mở trang thanh toán: ${url}` : '',
        'Trạng thái hiện tại vẫn là chờ thanh toán. Bạn cần hoàn tất trên trang thanh toán.',
      ]
        .filter(Boolean)
        .join('\n');
    }

    const bookingResult = results.find(
      (result) =>
        (result.name === CHAT_TOOL_NAMES.CREATE_BOOKING ||
          result.name === CHAT_TOOL_NAMES.HOLD_SEATS) &&
        result.response.success === true &&
        Boolean(result.response.booking),
    );

    if (bookingResult) {
      const booking =
        (bookingResult.response.booking as Record<string, unknown>) ?? {};
      const bookingId = String(booking.bookingId ?? '').trim();
      const bookingCode = String(booking.bookingCode ?? '').trim();
      const expiresAt = booking.expiresAt
        ? new Date(String(booking.expiresAt)).toLocaleString('vi-VN')
        : '';

      return [
        'Đã giữ ghế và tạo đơn đặt vé thành công.',
        bookingCode ? `Mã đơn: ${bookingCode}` : '',
        bookingId ? `Booking ID: ${bookingId}` : '',
        `Tổng tiền: ${this.formatVnd(booking.totalAmount)}`,
        expiresAt ? `Hạn thanh toán: ${expiresAt}` : '',
        'Chọn phương thức thanh toán: MOMO, VNPAY, BANKING, CASH hoặc MOCK.',
      ]
        .filter(Boolean)
        .join('\n');
    }

    return null;
  }

  private isRateLimited(error: unknown): boolean {
    return (error as AxiosError)?.response?.status === 429;
  }

  private retryDelayMs(error: unknown, attempt: number): number {
    const retryAfter = Number(
      (error as AxiosError)?.response?.headers?.['retry-after'],
    );

    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      return Math.min(retryAfter * 1_000, 5_000);
    }

    return Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, 5_000);
  }

  private async waitBeforeRetry(
    error: unknown,
    attempt: number,
    signal?: AbortSignal,
  ): Promise<void> {
    const delay = this.retryDelayMs(error, attempt);
    this.logger.warn(
      `Gemini trả 429, thử lại lần ${attempt + 1} sau ${delay}ms.`,
    );

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, delay);
      const abort = () => {
        clearTimeout(timer);
        reject(Object.assign(new Error('Request aborted'), { name: 'CanceledError' }));
      };

      if (signal?.aborted) return abort();
      signal?.addEventListener('abort', abort, { once: true });
    });
  }

  async reply(
    messages: ChatMessageDto[],
    userId: number,
  ): Promise<string> {
    const confirmedArgs = this.confirmedSeatActionArgs(messages);

    if (confirmedArgs) {
      const response = await this.executeTool(
        CHAT_TOOL_NAMES.HOLD_SEATS,
        confirmedArgs,
        userId,
        messages,
      );

      return (
        this.terminalToolReply([
          { name: CHAT_TOOL_NAMES.HOLD_SEATS, response },
        ]) ?? 'Không thể hoàn tất thao tác giữ ghế.'
      );
    }


    if (!this.apiKey && this.groqApiKey) {

      return this.replyWithGroq(messages, userId);

    }


    const contents = this.buildContents(messages);
    const apiKey = this.apiKey;

    if (!apiKey) {
      return this.replyWithGroq(messages, userId);
    }

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
      let payload: GeminiResponse;

      try {
        payload = await this.callGemini(apiKey, contents);
      } catch (error) {
        if (this.shouldFallbackToGroq(error)) {
          return this.replyWithGroq(messages, userId);
        }
        throw error;
      }
      const parts = this.extractParts(payload);
      const calls = parts.filter((part) => part.functionCall);

      if (calls.length === 0) {
        const text = this.partsToText(parts);
        if (text) return text;

        const blockReason =
          payload?.promptFeedback?.blockReason ||
          payload?.candidates?.[0]?.finishReason;

        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_GATEWAY,
            code: (blockReason
              ? 'BLOCKED'
              : 'EMPTY_RESPONSE') as ChatErrorCode,
            message: blockReason
              ? 'Nội dung bị bộ lọc an toàn của AI chặn. Hãy thử diễn đạt lại câu hỏi.'
              : 'AI không trả về nội dung nào.',
          },
          HttpStatus.BAD_GATEWAY,
        );
      }

      if (round === MAX_TOOL_ROUNDS) {
        this.logger.warn(
          `Đạt trần ${MAX_TOOL_ROUNDS} vòng gọi công cụ.`,
        );
        return (
          this.partsToText(parts) ||
          'Mình chưa hoàn tất được thao tác. Bạn thử lại từ bước gần nhất nhé.'
        );
      }

      contents.push({
        role: 'model',
        parts,
      });

      const results: Array<{
        name: string;
        response: Record<string, unknown>;
      }> = [];

      for (const part of calls) {
        const name = part.functionCall!.name;
        const args = part.functionCall!.args ?? {};

        this.logger.debug(
          `Gọi công cụ ${name} với ${JSON.stringify(args)}`,
        );

        results.push({
          name,
          response: await this.executeTool(
            name,
            args,
            userId,
            messages,
          ),
        });
      }

      const terminalReply = this.terminalToolReply(results);
      if (terminalReply) return terminalReply;

      contents.push(this.buildFunctionResponseContent(results));
    }

    throw new HttpException(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        code: 'EMPTY_RESPONSE' as ChatErrorCode,
        message: 'Không tạo được câu trả lời.',
      },
      HttpStatus.BAD_GATEWAY,
    );
  }

  private async callGemini(
    apiKey: string,
    contents: GeminiContent[],
  ): Promise<GeminiResponse> {
    for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
      try {
        const response = await axios.post<GeminiResponse>(
          `${GEMINI_BASE}/${encodeURIComponent(
            this.model,
          )}:generateContent`,
          {
            ...this.requestBody,
            contents,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            timeout: REQUEST_TIMEOUT_MS,
          },
        );

        return response.data;
      } catch (error) {
        if (
          this.isRateLimited(error) &&
          attempt < MAX_RATE_LIMIT_RETRIES
        ) {
          await this.waitBeforeRetry(error, attempt);
          continue;
        }

        throw this.toHttpException(error);
      }
    }

    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: 'RATE_LIMITED' as ChatErrorCode,
        message: 'Đã vượt hạn mức gọi AI. Vui lòng đợi một lát rồi thử lại.',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  async *streamReply(
    messages: ChatMessageDto[],
    userId: number,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatStreamEvent> {
    const confirmedArgs = this.confirmedSeatActionArgs(messages);

    if (confirmedArgs) {
      yield { type: 'tool', tool: CHAT_TOOL_NAMES.HOLD_SEATS };

      const response = await this.executeTool(
        CHAT_TOOL_NAMES.HOLD_SEATS,
        confirmedArgs,
        userId,
        messages,
      );

      const reply =
        this.terminalToolReply([
          { name: CHAT_TOOL_NAMES.HOLD_SEATS, response },
        ]) ?? 'Không thể hoàn tất thao tác giữ ghế.';

      yield { type: 'delta', text: reply };
      yield { type: 'done' };
      return;
    }

    let contents: GeminiContent[];

    try {
      if (!this.apiKey && this.groqApiKey) {
        try {
          const fallbackReply = await this.replyWithGroq(messages, userId);
          yield { type: 'delta', text: fallbackReply };
          yield { type: 'done' };
        } catch (fallbackError) {
          yield this.toStreamError(fallbackError);
        }
        return;
      }

      contents = this.buildContents(messages);
    } catch (error) {
      yield this.toStreamError(error);
      return;
    }

    const apiKey = this.apiKey;

    if (!apiKey) {
      try {
        const fallbackReply = await this.replyWithGroq(
          messages,
          userId,
        );
        yield { type: 'delta', text: fallbackReply };
        yield { type: 'done' };
      } catch (fallbackError) {
        yield this.toStreamError(fallbackError);
      }
      return;
    }

    try {
      for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
        const collectedParts: GeminiPart[] = [];
        let emittedText = false;

        for await (const part of this.streamGeminiParts(
          apiKey,
          contents,
          signal,
        )) {
          if (part.text) {
            emittedText = true;
            collectedParts.push(part);
            yield {
              type: 'delta',
              text: part.text,
            };
          } else if (part.functionCall) {
            collectedParts.push(part);
            yield {
              type: 'tool',
              tool: part.functionCall.name,
            };
          }
        }

        const calls = collectedParts.filter((part) => part.functionCall);

        if (calls.length === 0) {
          if (!emittedText) {
            yield {
              type: 'error',
              code: 'EMPTY_RESPONSE',
              message: 'AI không trả về nội dung nào.',
            };
            return;
          }

          yield { type: 'done' };
          return;
        }

        if (round === MAX_TOOL_ROUNDS) {
          yield { type: 'done' };
          return;
        }

        contents.push({
          role: 'model',
          parts: collectedParts,
        });

        const results: Array<{
          name: string;
          response: Record<string, unknown>;
        }> = [];

        for (const part of calls) {
          const name = part.functionCall!.name;
          results.push({
            name,
            response: await this.executeTool(
              name,
              part.functionCall!.args ?? {},
              userId,
              messages,
            ),
          });
        }

        const terminalReply = this.terminalToolReply(results);
        if (terminalReply) {
          yield { type: 'delta', text: terminalReply };
          yield { type: 'done' };
          return;
        }

        contents.push(this.buildFunctionResponseContent(results));
      }

      yield { type: 'done' };
    } catch (error) {
      if (
        signal?.aborted ||
        (error as Error)?.name === 'CanceledError'
      ) {
        return;
      }

      if (this.shouldFallbackToGroq(error)) {
        try {
          const fallbackReply = await this.replyWithGroq(
            messages,
            userId,
          );
          yield { type: 'delta', text: fallbackReply };
          yield { type: 'done' };
        } catch (fallbackError) {
          yield this.toStreamError(fallbackError);
        }
        return;
      }

      yield this.toStreamError(error);
    }
  }

  private async *streamGeminiParts(
    apiKey: string,
    contents: GeminiContent[],
    signal?: AbortSignal,
  ): AsyncGenerator<GeminiPart> {
    let stream: Readable | undefined;

    for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
      try {
        const response = await axios.post(
          `${GEMINI_BASE}/${encodeURIComponent(
            this.model,
          )}:streamGenerateContent?alt=sse`,
          {
            ...this.requestBody,
            contents,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            responseType: 'stream',
            timeout: REQUEST_TIMEOUT_MS,
            signal,
          },
        );

        stream = response.data as Readable;
        break;
      } catch (error) {
        if (
          this.isRateLimited(error) &&
          attempt < MAX_RATE_LIMIT_RETRIES &&
          !signal?.aborted
        ) {
          await this.waitBeforeRetry(error, attempt, signal);
          continue;
        }

        throw await this.toHttpExceptionFromStream(error);
      }
    }

    if (!stream) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: 'RATE_LIMITED' as ChatErrorCode,
          message: 'Đã vượt hạn mức gọi AI. Vui lòng đợi một lát rồi thử lại.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    let buffer = '';

    for await (const chunk of stream) {
      buffer += chunk.toString('utf8');
      buffer = buffer.replace(/\r\n/g, '\n');

      let boundary = buffer.indexOf('\n\n');

      while (boundary !== -1) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');

        const dataLine = rawEvent
          .split('\n')
          .find((line) => line.startsWith('data:'));

        if (!dataLine) continue;

        const json = dataLine.slice(5).trim();
        if (!json || json === '[DONE]') continue;

        let parsed: GeminiResponse;
        try {
          parsed = JSON.parse(json);
        } catch {
          this.logger.warn(
            'Bỏ qua một sự kiện SSE không parse được.',
          );
          continue;
        }

        for (const part of this.extractParts(parsed)) {
          if (part.text || part.functionCall) {
            yield part;
          }
        }
      }
    }
  }

  private toHttpException(error: unknown): HttpException {
    if (error instanceof HttpException) return error;

    const axiosError =
      error as AxiosError<{ error?: { message?: string } }>;
    const upstreamStatus = axiosError.response?.status;
    const upstreamMessage =
      axiosError.response?.data?.error?.message ??
      axiosError.message;

    this.logger.error(
      `Gemini lỗi [${
        upstreamStatus ?? axiosError.code ?? 'network'
      }]: ${upstreamMessage}`,
    );

    const build = (
      status: HttpStatus,
      code: ChatErrorCode,
      message: string,
    ) =>
      new HttpException(
        {
          statusCode: status,
          code,
          message,
        },
        status,
      );

    if (
      axiosError.code === 'ECONNABORTED' ||
      axiosError.code === 'ETIMEDOUT'
    ) {
      return build(
        HttpStatus.GATEWAY_TIMEOUT,
        'TIMEOUT',
        'AI phản hồi quá lâu. Bạn thử lại hoặc hỏi ngắn gọn hơn nhé.',
      );
    }

    switch (upstreamStatus) {
      case 400:
        return build(
          HttpStatus.BAD_GATEWAY,
          'INVALID_REQUEST',
          `Yêu cầu gửi lên AI không hợp lệ: ${upstreamMessage}`,
        );

      case 401:
      case 403:
        return build(
          HttpStatus.BAD_GATEWAY,
          'INVALID_API_KEY',
          'GEMINI_API_KEY không hợp lệ hoặc chưa được kích hoạt.',
        );

      case 404:
        return build(
          HttpStatus.BAD_GATEWAY,
          'MODEL_NOT_FOUND',
          `Không tìm thấy model "${this.model}". Kiểm tra GEMINI_MODEL trong .env.`,
        );

      case 429:
        return build(
          HttpStatus.TOO_MANY_REQUESTS,
          'RATE_LIMITED',
          'Đã vượt hạn mức gọi AI. Vui lòng đợi một lát rồi thử lại.',
        );

      default:
        return build(
          HttpStatus.BAD_GATEWAY,
          'UPSTREAM_ERROR',
          'Không thể nhận phản hồi từ trợ lý AI lúc này.',
        );
    }
  }

  private async toHttpExceptionFromStream(
    error: unknown,
  ): Promise<HttpException> {
    const axiosError = error as AxiosError;
    const data = axiosError?.response?.data as unknown;

    if (data && typeof (data as Readable).on === 'function') {
      try {
        const chunks: Buffer[] = [];

        for await (const chunk of data as Readable) {
          chunks.push(Buffer.from(chunk));
        }

        (axiosError.response as { data: unknown }).data = JSON.parse(
          Buffer.concat(chunks).toString('utf8'),
        );
      } catch {
        (axiosError.response as { data: unknown }).data = {};
      }
    }

    return this.toHttpException(axiosError);
  }

  private toStreamError(error: unknown): ChatStreamEvent {
    const httpError = this.toHttpException(error);
    const body = httpError.getResponse() as {
      code?: ChatErrorCode;
      message?: string;
    };

    return {
      type: 'error',
      code: body?.code ?? 'UPSTREAM_ERROR',
      message:
        body?.message ??
        'Không thể nhận phản hồi từ trợ lý AI lúc này.',
    };
  }
}
