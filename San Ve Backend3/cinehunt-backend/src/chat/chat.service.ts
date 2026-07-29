import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { ChatMessageDto } from './dto/chat-message.dto';

type GeminiPart = {
  text?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
};

const SYSTEM_PROMPT = `
Bạn là trợ lý AI của CineHunt, nền tảng đặt vé xem phim trực tuyến.
Nhiệm vụ:
- Gợi ý phim đang chiếu hoặc sắp chiếu khi có dữ liệu phù hợp.
- Hướng dẫn quy trình đặt vé, chọn suất, chọn ghế và thanh toán.
- Giải đáp câu hỏi về rạp, giá vé và combo bắp nước.
- Trả lời ngắn gọn, thân thiện, bằng tiếng Việt.
- Không tự bịa lịch chiếu, giá vé, tình trạng ghế hoặc khuyến mãi.
- Khi thiếu dữ liệu thời gian thực, nói rõ và hướng dẫn người dùng kiểm tra trên CineHunt.
- Nếu câu hỏi ngoài phạm vi phim ảnh và đặt vé, lịch sự từ chối.
`.trim();

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly configService: ConfigService) {}

  async reply(messages: ChatMessageDto[]): Promise<string> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY')?.trim();
    const model =
      this.configService.get<string>('GEMINI_MODEL')?.trim() ||
      'gemini-3.6-flash';

    if (!apiKey) {
      throw new InternalServerErrorException(
        'Backend chưa cấu hình GEMINI_API_KEY.',
      );
    }

    const contents = messages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content.trim() }],
    }));

    try {
      const response = await axios.post<GeminiResponse>(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model,
        )}:generateContent`,
        {
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          timeout: 30_000,
        },
      );

      const reply = response.data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('')
        .trim();

      if (!reply) {
        throw new BadGatewayException('AI không trả về nội dung.');
      }

      return reply;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      const axiosError = error as AxiosError<{
        error?: { message?: string };
      }>;

      this.logger.error(
        `Gemini request failed: ${
          axiosError.response?.data?.error?.message ||
          axiosError.message ||
          'Unknown error'
        }`,
      );

      throw new BadGatewayException(
        'Không thể nhận phản hồi từ trợ lý AI lúc này.',
      );
    }
  }
}
