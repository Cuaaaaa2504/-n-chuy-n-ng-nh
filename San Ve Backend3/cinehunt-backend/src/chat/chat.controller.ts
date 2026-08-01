import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async chat(
    @Body() request: ChatRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ reply: string }> {
    return {
      reply: await this.chatService.reply(request.messages, user.userId),
    };
  }

  @Post('stream')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async chatStream(
    @Body() request: ChatRequestDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const controller = new AbortController();
    req.on('close', () => controller.abort());

    const send = (event: unknown) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    };

    try {
      for await (const event of this.chatService.streamReply(
        request.messages,
        user.userId,
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
