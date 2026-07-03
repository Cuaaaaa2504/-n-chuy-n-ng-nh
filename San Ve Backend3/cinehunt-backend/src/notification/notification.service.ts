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

  async markAsRead(notifId: string, userId: number) {
    const notif = await this.notifRepo.findOne({
      where: { notification_id: notifId, user_id: userId },
    });
    if (!notif) throw new NotFoundException('Không tìm thấy thông báo');
    notif.is_read = true;
    notif.read_at = new Date();
    await this.notifRepo.save(notif);
    return { message: 'Đã đánh dấu đã đọc' };
  }

  async markAllAsRead(userId: number) {
    await this.notifRepo.update(
      { user_id: userId, is_read: false },
      { is_read: true, read_at: new Date() },
    );
    return { message: 'Đã đánh dấu tất cả là đã đọc' };
  }

  async countUnread(userId: number) {
    const count = await this.notifRepo.count({
      where: { user_id: userId, is_read: false },
    });
    return { unreadCount: count };
  }

  /** Gửi thông báo nội bộ (service khác gọi) */
  async push(dto: CreateNotificationDto) {
    const notif = this.notifRepo.create({
      user_id: dto.userId,
      title: dto.title,
      message: dto.message,
      notification_type: dto.notificationType ?? 'SYSTEM',
      reference_type: dto.referenceType ?? null,
      reference_id: dto.referenceId ?? null,
      is_read: false,
      read_at: null,
    });
    return this.notifRepo.save(notif);
  }

  /** ADMIN broadcast cho nhiều user */
  async broadcast(
    dto: Omit<CreateNotificationDto, 'userId'>,
    userIds: number[],
  ) {
    const notifs = userIds.map((uid) =>
      this.notifRepo.create({
        user_id: uid,
        title: dto.title,
        message: dto.message,
        notification_type: dto.notificationType ?? 'SYSTEM',
        reference_type: dto.referenceType ?? null,
        reference_id: dto.referenceId ?? null,
        is_read: false,
        read_at: null,
      }),
    );
    return this.notifRepo.save(notifs);
  }
}
