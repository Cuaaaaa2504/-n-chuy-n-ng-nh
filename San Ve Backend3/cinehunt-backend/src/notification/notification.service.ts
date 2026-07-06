import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  getMyNotifications(userId: number): Promise<Notification[]> {
    return this.repo.find({
      where: { userId } as any,
      order: { createdAt: 'DESC' } as any,
    });
  }

  // alias for backward compat
  findByUser(userId: number): Promise<Notification[]> {
    return this.getMyNotifications(userId);
  }

  async markAsRead(notifId: number, userId: number): Promise<Notification> {
    const notif = await this.repo.findOne({
      where: { notificationId: notifId, userId } as any,
    });
    if (!notif) throw new NotFoundException('Không tìm thấy thông báo');
    (notif as any).isRead = true;
    (notif as any).readAt = new Date();
    return this.repo.save(notif);
  }

  // alias
  markRead(notifId: number, userId: number): Promise<Notification> {
    return this.markAsRead(notifId, userId);
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.repo.update(
      { userId, isRead: false } as any,
      { isRead: true, readAt: new Date() } as any,
    );
  }

  // alias
  markAllRead(userId: number): Promise<void> {
    return this.markAllAsRead(userId);
  }

  countUnread(userId: number): Promise<number> {
    return this.repo.count({
      where: { userId, isRead: false } as any,
    });
  }

  async push(dto: {
    userId: number;
    title: string;
    message?: string;
    body?: string;
    type?: string;
  }): Promise<Notification> {
    const notif = this.repo.create({
      userId: dto.userId,
      title: dto.title,
      message: dto.message ?? dto.body ?? '',
      type: dto.type ?? 'INFO',
    } as any);
    return this.repo.save(notif);
  }

  // alias
  create(dto: { userId: number; title: string; body?: string; message?: string; type?: string }): Promise<Notification> {
    return this.push(dto);
  }

  async broadcast(userIds: number[], title: string, body: string, type = 'INFO') {
    const notifs = userIds.map((uid) =>
      this.repo.create({
        userId: uid,
        title,
        message: body,
        type,
      } as any),
    );
    return this.repo.save(notifs);
  }
}
