import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async chat(@Body() request: ChatRequestDto): Promise<{ reply: string }> {
    return {
      reply: await this.chatService.reply(request.messages),
    };
  }
}
