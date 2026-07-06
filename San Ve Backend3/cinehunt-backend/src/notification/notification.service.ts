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

  findByUser(userId: number): Promise<Notification[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async markRead(notifId: number, userId: number): Promise<Notification> {
    const notif = await this.repo.findOne({
      where: { notificationId: notifId, userId },
    });
    if (!notif) throw new NotFoundException('Không tìm thấy thông báo');
    notif.isRead = true;
    notif.readAt = new Date();
    return this.repo.save(notif);
  }

  async markAllRead(userId: number): Promise<void> {
    await this.repo.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  countUnread(userId: number): Promise<number> {
    return this.repo.count({
      where: { userId, isRead: false },
    });
  }

  async create(dto: {
    userId: number;
    title: string;
    body: string;
    type?: string;
  }): Promise<Notification> {
    const notif = this.repo.create({
      userId: dto.userId,
      title: dto.title,
      body: dto.body,
      type: dto.type ?? 'INFO',
    });
    return this.repo.save(notif);
  }

  async broadcast(userIds: number[], title: string, body: string, type = 'INFO') {
    const notifs = userIds.map((uid) =>
      this.repo.create({
        userId: uid,
        title,
        body,
        type,
      }),
    );
    return this.repo.save(notifs);
  }
}
