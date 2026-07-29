/**
 * ChatService — cầu nối giữa CineHunt và Gemini.
 *
 * Các lỗi được xử lý trong file này:
 *   CHAT-01  Lịch sử hội thoại bắt đầu bằng `assistant` -> Gemini trả 400.
 *   CHAT-03  Dùng model fallback còn hoạt động và hỗ trợ function calling.
 *   CHAT-04  Thiếu GEMINI_API_KEY -> thông báo phải nói rõ phải làm gì.
 *   CHAT-05  Chatbot không có dữ liệu thật -> bổ sung function calling.
 *   CHAT-06  Lỗi trả về phải phân biệt được loại (mã lỗi máy đọc được).
 *   CHAT-07  Hỗ trợ streaming + huỷ giữa chừng.
 */

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
import { ChatMessageDto } from './dto/chat-message.dto';
import { ChatDataService } from './chat-data.service';
import {
  CHAT_FUNCTION_DECLARATIONS,
  CHAT_TOOL_NAMES,
} from './chat-tools';

/* ==========================================================================
 * FIX CHAT-03 — TÊN MODEL
 *
 * Fallback phải trỏ tới model còn hoạt động và hỗ trợ function calling.
 * Tại thời điểm hợp nhất (29/07/2026), Gemini 2.0 Flash đã ngừng hoạt động;
 * Gemini 3.6 Flash là model ổn định phù hợp cho vòng gọi công cụ của CHAT-05.
 * ======================================================================== */
const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';

/** Các model đã bị ngừng phục vụ, cảnh báo sớm lúc khởi động. */
const KNOWN_SHUTDOWN_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-001'];

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Số vòng gọi công cụ tối đa cho một câu hỏi. Chặn vòng lặp vô hạn. */
const MAX_TOOL_ROUNDS = 4;

const REQUEST_TIMEOUT_MS = 30_000;

type GeminiPart = {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
};

type GeminiContent = {
  role: 'user' | 'model';
  parts: GeminiPart[];
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[]; role?: string };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
};

/** Mã lỗi trả về cho frontend (FIX CHAT-06). */
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

CÔNG CỤ TRUY VẤN DỮ LIỆU THẬT:
Bạn được nối trực tiếp với cơ sở dữ liệu CineHunt qua các hàm search_movies,
get_movie_detail, get_showtimes, check_seat_availability, list_combos,
list_cinemas.

QUY TẮC BẮT BUỘC:
- Mọi câu hỏi về phim đang chiếu, lịch chiếu, giá vé, tình trạng ghế, combo hay
  địa chỉ rạp PHẢI gọi hàm tương ứng trước khi trả lời. Không được trả lời từ
  kiến thức nền của bạn — dữ liệu của CineHunt là nguồn duy nhất đúng.
- Nếu hàm trả về danh sách rỗng, hãy nói thẳng là hiện chưa có dữ liệu phù hợp.
  TUYỆT ĐỐI không bịa tên phim, giờ chiếu, giá vé hay mã ghế.
- Muốn kiểm tra ghế thì phải có showtimeId; nếu chưa có, gọi get_showtimes trước.
- Giá tiền do hàm trả về đã ở dạng VNĐ, giữ nguyên, không tự quy đổi hay làm tròn.

NHIỆM VỤ KHÁC:
- Hướng dẫn quy trình đặt vé: chọn phim → chọn suất → chọn ghế → chọn combo →
  thanh toán.
- Bạn KHÔNG thể tự đặt vé, giữ ghế hay thanh toán hộ. Khi người dùng muốn đặt,
  hãy hướng dẫn họ thao tác trên giao diện CineHunt.
- Không truy cập và không suy đoán thông tin cá nhân, lịch sử đặt vé hay thanh
  toán của bất kỳ ai.
- Trả lời ngắn gọn, thân thiện, bằng tiếng Việt. Ưu tiên gạch đầu dòng khi liệt kê.
- Nếu câu hỏi ngoài phạm vi phim ảnh và đặt vé, lịch sự từ chối.
`.trim();

@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly chatData: ChatDataService,
  ) {}

  /* ======================================================================
   * FIX CHAT-04 — phát hiện thiếu cấu hình NGAY LÚC KHỞI ĐỘNG
   *
   * Trước đây lỗi thiếu GEMINI_API_KEY chỉ lộ ra khi người dùng đầu tiên nhắn
   * tin, dưới dạng một cục 500 ở frontend. Cả nhóm mất thời gian debug frontend
   * trong khi vấn đề nằm ở một dòng .env. Giờ backend hét lên ngay lúc boot.
   * ==================================================================== */
  onModuleInit(): void {
    const apiKey = this.apiKey;
    const model = this.model;

    if (!apiKey) {
      this.logger.error(
        'CHƯA CÓ GEMINI_API_KEY -> chatbot sẽ không hoạt động. ' +
          'Thêm dòng GEMINI_API_KEY=... vào cinehunt-backend/.env ' +
          '(lấy key miễn phí tại https://aistudio.google.com/apikey) rồi khởi động lại.',
      );
    } else {
      this.logger.log(`Chatbot Gemini sẵn sàng (model: ${model}).`);
    }

    if (KNOWN_SHUTDOWN_MODELS.includes(model)) {
      this.logger.error(
        `GEMINI_MODEL="${model}" đã bị Google ngừng phục vụ, mọi request sẽ thất bại. ` +
          `Đổi thành "${DEFAULT_GEMINI_MODEL}" trong .env.`,
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

  /* ======================================================================
   * FIX CHAT-01 — CHUẨN HOÁ LỊCH SỬ HỘI THOẠI
   *
   * Gemini bắt buộc `contents` phải bắt đầu bằng role `user` và luân phiên
   * user/model. Frontend khởi tạo danh sách tin nhắn bằng một lời chào
   * role='assistant' và gửi kèm nó lên -> phần tử đầu tiên là `model` ->
   * 400 INVALID_ARGUMENT ngay ở tin nhắn đầu tiên.
   *
   * Frontend đã được sửa để không gửi lời chào nữa (xem useChat.ts), NHƯNG
   * việc lọc vẫn phải làm lại ở đây. Lý do: backend là nơi duy nhất bắt buộc
   * phải đúng. Client có thể là app khác, bản build cũ còn cache, hay Postman
   * của người chấm đồ án — không thể tin client đã gửi đúng định dạng.
   *
   * Ba bước:
   *   1. Bỏ mọi tin nhắn model ở ĐẦU danh sách (lời chào).
   *   2. Gộp các tin nhắn liên tiếp cùng role (vi phạm quy tắc luân phiên).
   *   3. Đảm bảo tin nhắn CUỐI là của user, nếu không thì không có gì để trả lời.
   * ==================================================================== */
  private buildContents(messages: ChatMessageDto[]): GeminiContent[] {
    const mapped: GeminiContent[] = (messages ?? [])
      .filter((m) => m && typeof m.content === 'string' && m.content.trim())
      .map((m) => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        parts: [{ text: m.content.trim() }],
      }));

    // Bước 1
    let start = 0;
    while (start < mapped.length && mapped[start].role === 'model') {
      start += 1;
    }
    const trimmed = mapped.slice(start);

    // Bước 2
    const merged: GeminiContent[] = [];
    for (const item of trimmed) {
      const last = merged[merged.length - 1];
      if (last && last.role === item.role) {
        last.parts[0].text = `${last.parts[0].text}\n\n${item.parts[0].text}`;
      } else {
        merged.push({ role: item.role, parts: [{ text: item.parts[0].text }] });
      }
    }

    // Bước 3
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
            'Backend chưa cấu hình GEMINI_API_KEY. Thêm biến này vào file .env rồi khởi động lại server.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return apiKey;
  }

  private get requestBody() {
    return {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      tools: [{ functionDeclarations: CHAT_FUNCTION_DECLARATIONS }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    };
  }

  /* ======================================================================
   * FIX CHAT-05 (phần 3/3) — THỰC THI CÔNG CỤ
   * ==================================================================== */
  private async executeTool(
    name: string,
    args: Record<string, unknown>,
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
          return (await this.chatData.checkSeatAvailability(args as any)) as any;
        case CHAT_TOOL_NAMES.LIST_COMBOS:
          return (await this.chatData.listCombos(args as any)) as any;
        case CHAT_TOOL_NAMES.LIST_CINEMAS:
          return (await this.chatData.listCinemas(args as any)) as any;
        default:
          this.logger.warn(`Model gọi công cụ không tồn tại: ${name}`);
          return { error: `Không có công cụ tên "${name}".` };
      }
    } catch (error) {
      // Lỗi DB KHÔNG được làm sập cả câu trả lời. Trả lỗi vào functionResponse
      // để model tự nói "hiện chưa tra được dữ liệu" thay vì im lặng hoặc bịa.
      this.logger.error(
        `Công cụ ${name} lỗi: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return {
        error: 'Không truy vấn được dữ liệu CineHunt lúc này.',
        hint: 'Hãy nói với người dùng rằng hệ thống đang bận và mời họ thử lại sau.',
      };
    }
  }

  private extractParts(payload: GeminiResponse): GeminiPart[] {
    return payload?.candidates?.[0]?.content?.parts ?? [];
  }

  private partsToText(parts: GeminiPart[]): string {
    return parts
      .map((p) => p.text ?? '')
      .join('')
      .trim();
  }

  private buildFunctionResponseContent(
    results: Array<{ name: string; response: Record<string, unknown> }>,
  ): GeminiContent {
    return {
      role: 'user',
      parts: results.map((r) => ({
        functionResponse: { name: r.name, response: r.response },
      })),
    };
  }

  /* ======================================================================
   * CHẾ ĐỘ 1 — TRẢ LỜI MỘT LẦN (endpoint POST /chat)
   * ==================================================================== */
  async reply(messages: ChatMessageDto[]): Promise<string> {
    const apiKey = this.requireApiKey();
    const contents = this.buildContents(messages);

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
      const payload = await this.callGemini(apiKey, contents);
      const parts = this.extractParts(payload);
      const calls = parts.filter((p) => p.functionCall);

      if (calls.length === 0) {
        const text = this.partsToText(parts);
        if (text) return text;

        const blockReason =
          payload?.promptFeedback?.blockReason ||
          payload?.candidates?.[0]?.finishReason;

        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_GATEWAY,
            code: (blockReason ? 'BLOCKED' : 'EMPTY_RESPONSE') as ChatErrorCode,
            message: blockReason
              ? 'Nội dung bị bộ lọc an toàn của AI chặn. Hãy thử diễn đạt lại câu hỏi.'
              : 'AI không trả về nội dung nào.',
          },
          HttpStatus.BAD_GATEWAY,
        );
      }

      if (round === MAX_TOOL_ROUNDS) {
        this.logger.warn(
          `Đạt trần ${MAX_TOOL_ROUNDS} vòng gọi công cụ, dừng và trả lời bằng dữ liệu đã có.`,
        );
        return (
          this.partsToText(parts) ||
          'Mình cần tra thêm dữ liệu nhưng chưa hoàn tất được. Bạn thử hỏi cụ thể hơn nhé.'
        );
      }

      contents.push({ role: 'model', parts });

      const results = [];
      for (const part of calls) {
        const name = part.functionCall.name;
        const args = part.functionCall.args ?? {};
        this.logger.debug(`Gọi công cụ ${name} với ${JSON.stringify(args)}`);
        results.push({ name, response: await this.executeTool(name, args) });
      }

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
    try {
      const response = await axios.post<GeminiResponse>(
        `${GEMINI_BASE}/${encodeURIComponent(this.model)}:generateContent`,
        { ...this.requestBody, contents },
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
      throw this.toHttpException(error);
    }
  }

  /* ======================================================================
   * CHẾ ĐỘ 2 — STREAMING (FIX CHAT-07)
   *
   * Vòng lặp công cụ vẫn giữ nguyên, chỉ khác là mỗi lượt gọi
   * `streamGenerateContent?alt=sse` để chữ hiện dần thay vì chờ đủ 30 giây.
   * `signal` đến từ AbortController của controller: khi người dùng bấm "Dừng"
   * hoặc đóng tab, request sang Google bị huỷ luôn chứ không chạy tiếp vô ích.
   * ==================================================================== */
  async *streamReply(
    messages: ChatMessageDto[],
    signal?: AbortSignal,
  ): AsyncGenerator<ChatStreamEvent> {
    let apiKey: string;
    let contents: GeminiContent[];

    try {
      apiKey = this.requireApiKey();
      contents = this.buildContents(messages);
    } catch (error) {
      yield this.toStreamError(error);
      return;
    }

    try {
      for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
        const collectedParts: GeminiPart[] = [];
        let emittedText = false;

        for await (const part of this.streamGeminiParts(apiKey, contents, signal)) {
          if (part.text) {
            emittedText = true;
            collectedParts.push(part);
            yield { type: 'delta', text: part.text };
          } else if (part.functionCall) {
            collectedParts.push(part);
            yield { type: 'tool', tool: part.functionCall.name };
          }
        }

        const calls = collectedParts.filter((p) => p.functionCall);

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

        contents.push({ role: 'model', parts: collectedParts });

        const results = [];
        for (const part of calls) {
          const name = part.functionCall.name;
          results.push({
            name,
            response: await this.executeTool(name, part.functionCall.args ?? {}),
          });
        }
        contents.push(this.buildFunctionResponseContent(results));
      }

      yield { type: 'done' };
    } catch (error) {
      // Người dùng tự huỷ thì không phải lỗi, đừng ghi log đỏ.
      if (signal?.aborted || (error as Error)?.name === 'CanceledError') {
        return;
      }
      yield this.toStreamError(error);
    }
  }

  /**
   * Đọc luồng SSE của Gemini và bắn ra từng `part` một.
   *
   * Định dạng: mỗi sự kiện là một dòng `data: {...}` kết thúc bằng dòng trống.
   * Chunk TCP KHÔNG trùng ranh giới sự kiện — một sự kiện có thể bị cắt làm đôi
   * giữa hai chunk. Vì vậy phải giữ `buffer` và chỉ cắt tại `\n\n`; parse thẳng
   * từng chunk là lỗi kinh điển khiến JSON.parse thất bại ngẫu nhiên.
   */
  private async *streamGeminiParts(
    apiKey: string,
    contents: GeminiContent[],
    signal?: AbortSignal,
  ): AsyncGenerator<GeminiPart> {
    let stream: Readable;

    try {
      const response = await axios.post(
        `${GEMINI_BASE}/${encodeURIComponent(this.model)}:streamGenerateContent?alt=sse`,
        { ...this.requestBody, contents },
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
    } catch (error) {
      throw await this.toHttpExceptionFromStream(error);
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
          this.logger.warn('Bỏ qua một sự kiện SSE không parse được.');
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

  /* ======================================================================
   * FIX CHAT-06 — PHÂN LOẠI LỖI
   *
   * Trả về mã lỗi máy đọc được để frontend hiện thông báo đúng trọng tâm,
   * thay vì một chuỗi "Không thể nhận phản hồi..." cho cả 400, 404, 429 và 500.
   * ==================================================================== */
  private toHttpException(error: unknown): HttpException {
    if (error instanceof HttpException) return error;

    const axiosError = error as AxiosError<{ error?: { message?: string } }>;
    const upstreamStatus = axiosError.response?.status;
    const upstreamMessage =
      axiosError.response?.data?.error?.message ?? axiosError.message;

    this.logger.error(
      `Gemini lỗi [${upstreamStatus ?? axiosError.code ?? 'network'}]: ${upstreamMessage}`,
    );

    const build = (
      status: HttpStatus,
      code: ChatErrorCode,
      message: string,
    ) => new HttpException({ statusCode: status, code, message }, status);

    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
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
          'GEMINI_API_KEY không hợp lệ hoặc chưa được kích hoạt. Kiểm tra lại key trong .env.',
        );
      case 404:
        return build(
          HttpStatus.BAD_GATEWAY,
          'MODEL_NOT_FOUND',
          `Không tìm thấy model "${this.model}". Đặt GEMINI_MODEL=${DEFAULT_GEMINI_MODEL} trong .env.`,
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

  /**
   * Với `responseType: 'stream'`, body lỗi của axios là một Readable chứ không
   * phải object đã parse -> `error.response.data.error.message` luôn undefined
   * và mọi lỗi đều bị quy về UPSTREAM_ERROR. Đọc hết stream rồi mới phân loại.
   */
  private async toHttpExceptionFromStream(error: unknown): Promise<HttpException> {
    const axiosError = error as AxiosError;
    const data = axiosError?.response?.data as unknown;

    if (data && typeof (data as Readable).on === 'function') {
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of data as Readable) {
          chunks.push(Buffer.from(chunk));
        }
        (axiosError.response as any).data = JSON.parse(
          Buffer.concat(chunks).toString('utf8'),
        );
      } catch {
        (axiosError.response as any).data = {};
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
      message: body?.message ?? 'Không thể nhận phản hồi từ trợ lý AI lúc này.',
    };
  }
}
