import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatDataService } from './chat-data.service';
import { Movie } from '../entities/movie.entity';
import { Showtime } from '../entities/showtime.entity';
import { ShowtimeSeat } from '../entities/showtime-seat.entity';
import { ConcessionCombo } from '../entities/concession-combo.entity';
import { Cinema } from '../entities/cinema.entity';

@Module({
  // FIX CHAT-05: chatbot cần đọc dữ liệu thật -> đăng ký repository cho
  // ChatDataService. Chỉ đúng 5 entity công khai, không nhiều hơn.
  imports: [
    TypeOrmModule.forFeature([
      Movie,
      Showtime,
      ShowtimeSeat,
      ConcessionCombo,
      Cinema,
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatDataService],
})
export class ChatModule {}
