import {
  Body,
  Controller,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** Đường dẫn cũ, giữ nguyên để không phá client đang dùng. */
  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async chat(@Body() request: ChatRequestDto): Promise<{ reply: string }> {
    return {
      reply: await this.chatService.reply(request.messages),
    };
  }

  /* ======================================================================
   * FIX CHAT-07 — STREAMING + HUỶ GIỮA CHỪNG
   *
   * Dùng SSE thủ công qua @Res() thay vì decorator @Sse của Nest. Lý do: @Sse
   * chỉ nhận Observable và luôn bọc dữ liệu theo khuôn của nó, trong khi ở đây
   * cần kiểm soát cả sự kiện huỷ (`req.on('close')`) lẫn việc flush ngay từng
   * mẩu chữ.
   *
   * Ba header dưới đây đều bắt buộc:
   *   - `X-Accel-Buffering: no` để nginx (nếu deploy sau reverse proxy) không
   *     gom buffer rồi trả một cục — triệu chứng là "streaming không chạy trên
   *     server nhưng chạy ngon ở localhost".
   *   - `Cache-Control: no-cache` để trình duyệt không cache luồng.
   *   - `Connection: keep-alive` để giữ kết nối mở.
   * ==================================================================== */
  @Post('stream')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async chatStream(
    @Body() request: ChatRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const controller = new AbortController();

    // Người dùng bấm "Dừng" hoặc đóng tab -> huỷ luôn request sang Gemini.
    req.on('close', () => controller.abort());

    const send = (event: unknown) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    };

    try {
      for await (const event of this.chatService.streamReply(
        request.messages,
        controller.signal,
      )) {
        send(event);
        if (event.type === 'done' || event.type === 'error') break;
      }
    } catch (error) {
      send({
        type: 'error',
        code: 'UPSTREAM_ERROR',
        message:
          (error as { message?: string })?.message ??
          'Không thể nhận phản hồi từ trợ lý AI lúc này.',
      });
    } finally {
      if (!res.writableEnded) res.end();
    }
  }
}
