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

  findByUser(userId: number): Promise<Notification[]> {
    return this.getMyNotifications(userId);
  }

  async markAsRead(notifId: number | string, userId: number): Promise<Notification> {
    const id = Number(notifId);
    const notif = await this.repo.findOne({
      where: { notificationId: id, userId } as any,
    });
    if (!notif) throw new NotFoundException('Không tìm thấy thông báo');
    (notif as any).isRead = true;
    (notif as any).readAt = new Date();
    return this.repo.save(notif);
  }

  markRead(notifId: number | string, userId: number): Promise<Notification> {
    return this.markAsRead(notifId, userId);
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.repo.update(
      { userId, isRead: false } as any,
      { isRead: true, readAt: new Date() } as any,
    );
  }

  markAllRead(userId: number): Promise<void> {
    return this.markAllAsRead(userId);
  }

  countUnread(userId: number): Promise<number> {
    return this.repo.count({ where: { userId, isRead: false } as any });
  }

  async push(dto: {
    userId: number;
    title: string;
    message?: string;
    body?: string;
    type?: string;
  }): Promise<Notification> {
    const data: any = {
      userId: dto.userId,
      title: dto.title,
      message: dto.message ?? dto.body ?? '',
      type: dto.type ?? 'INFO',
    };
    const notif = this.repo.create(data as unknown as Notification);
    return this.repo.save(notif);
  }

  create(dto: { userId: number; title: string; body?: string; message?: string; type?: string }): Promise<Notification> {
    return this.push(dto);
  }

  async broadcast(userIds: number[], title: string, body: string, type = 'INFO'): Promise<Notification[]> {
    const notifs: Notification[] = userIds.map((uid) => {
      const data: any = { userId: uid, title, message: body, type };
      return this.repo.create(data as unknown as Notification);
    });
    return this.repo.save(notifs);
  }
}
