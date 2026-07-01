import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
  ) {}

  async getMyNotifications(userId: number) {
    return this.notifRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async markAsRead(notifId: number, userId: number) {
    const notif = await this.notifRepo.findOne({
      where: { notification_id: notifId, user_id: userId },
    });
    if (!notif) throw new NotFoundException('Không tìm thấy thông báo');
    notif.is_read = true;
    await this.notifRepo.save(notif);
    return { message: 'Đã đánh dấu đã đọc' };
  }

  async markAllAsRead(userId: number) {
    await this.notifRepo.update({ user_id: userId, is_read: false }, { is_read: true });
    return { message: 'Đã đánh dấu tất cả là đã đọc' };
  }

  async countUnread(userId: number) {
    const count = await this.notifRepo.count({
      where: { user_id: userId, is_read: false },
    });
    return { unreadCount: count };
  }

  // Dùng nội bộ (service khác gọi)
  async push(dto: CreateNotificationDto) {
    const notif = this.notifRepo.create({
      user_id: dto.userId,
      title: dto.title,
      body: dto.body,
      type: dto.type ?? 'SYSTEM',
      ref_id: dto.refId ?? null,
      is_read: false,
    });
    return this.notifRepo.save(notif);
  }

  // ADMIN push cho tất cả user
  async broadcast(dto: Omit<CreateNotificationDto, 'userId'>, userIds: number[]) {
    const notifs = userIds.map((uid) =>
      this.notifRepo.create({
        user_id: uid,
        title: dto.title,
        body: dto.body,
        type: dto.type ?? 'SYSTEM',
        is_read: false,
      }),
    );
    await this.notifRepo.save(notifs);
    return { message: `Đã gửi thông báo đến ${userIds.length} người dùng` };
  }
}
